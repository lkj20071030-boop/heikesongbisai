/* 智析 AI · 分环节 Agent 编排
 *
 * outline → compose → check → revise。
 * 每个模型环节：LLM → JSON 解析 → schema 校验 → 修复提示词重试 1 次 → 回退本地。
 * 全程吞掉异常，始终返回可用方案；无 Key 时由调用方直接使用本地引擎。
 */

import { callChat, parseJson } from './llm.js';
import { stageProfile } from './generate.js';
import {
  PROMPT_VERSION,
  buildOutlineMessages,
  buildComposeMessages,
  buildReviseMessages,
  buildRepairMessages
} from './agentPrompts.js';

const STAGE_META = {
  outline: { label: '生成方案骨架', timeoutMs: 20000 },
  compose: { label: '生成完整方案', timeoutMs: 30000 },
  check: { label: '质量检查' },
  revise: { label: '按质检修订', timeoutMs: 25000 }
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function textOf(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function fail(message) {
  return { ok: false, error: message };
}

function checkSourceIds(ids, validIds, label) {
  if (!Array.isArray(ids) || !ids.length) return `${label}缺少 sourceIds`;
  const bad = ids.filter((id) => !validIds.has(String(id)));
  if (bad.length) {
    return `${label}的 sourceIds 含非法 id：${bad.join('、')}；合法 id：${Array.from(validIds).join('、') || '（无）'}`;
  }
  return '';
}

function validateOutline(data, ctx) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return fail('方案骨架不是 JSON 对象');
  const objectives = asArray(data.objectives).filter((item) => item && textOf(item.text));
  if (objectives.length < 3) {
    return fail(`方案骨架至少需要 3 条目标，当前 ${objectives.length} 条`);
  }
  for (let index = 0; index < objectives.length; index += 1) {
    const problem = checkSourceIds(objectives[index].sourceIds, ctx.validIds, `第 ${index + 1} 条目标`);
    if (problem) return fail(problem);
  }

  const flow = asArray(data.flow).filter((item) => item && textOf(item.phase));
  if (flow.length < 4) {
    return fail(`方案骨架至少需要 4 段流程，当前 ${flow.length} 段`);
  }
  let total = 0;
  for (let index = 0; index < flow.length; index += 1) {
    const minutes = Number(flow[index].minutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return fail(`第 ${index + 1} 段流程的 minutes 不是有效正数`);
    }
    total += minutes;
    if (Array.isArray(flow[index].sourceIds) && flow[index].sourceIds.length) {
      const bad = flow[index].sourceIds.filter((id) => !ctx.validIds.has(String(id)));
      if (bad.length) {
        return fail(`第 ${index + 1} 段流程的 sourceIds 含非法 id：${bad.join('、')}`);
      }
    }
  }
  if (Math.abs(total - ctx.duration) > 1) {
    return fail(`流程 minutes 合计 ${total}，必须等于 ${ctx.duration}`);
  }
  return { ok: true };
}

function validatePlan(data, ctx) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return fail('完整方案不是 JSON 对象');

  const objectives = asArray(data.objectives).filter((item) => item && textOf(item.text));
  if (objectives.length < 3 || objectives.length > 4) {
    return fail(`完整方案目标需 3–4 条，当前 ${objectives.length} 条`);
  }
  for (let index = 0; index < objectives.length; index += 1) {
    const problem = checkSourceIds(objectives[index].sourceIds, ctx.validIds, `第 ${index + 1} 条目标`);
    if (problem) return fail(problem);
  }

  const prerequisites = asArray(data.prerequisites).filter((item) => item && textOf(item.label));
  for (let index = 0; index < prerequisites.length; index += 1) {
    const item = prerequisites[index];
    if (ctx.nodeIds.size && !ctx.nodeIds.has(textOf(item.nodeId))) {
      return fail(`前概念「${textOf(item.label)}」的 nodeId「${textOf(item.nodeId)}」不在图谱节点中；合法节点 id：${Array.from(ctx.nodeIds).join('、')}`);
    }
    if (Array.isArray(item.sourceIds) && item.sourceIds.length) {
      const bad = item.sourceIds.filter((id) => !ctx.validIds.has(String(id)));
      if (bad.length) {
        return fail(`前概念「${textOf(item.label)}」的 sourceIds 含非法 id：${bad.join('、')}`);
      }
    }
  }

  const flow = asArray(data.flow).filter((item) => item && textOf(item.phase));
  if (flow.length < 4 || flow.length > 7) {
    return fail(`完整方案流程需 4–7 段，当前 ${flow.length} 段`);
  }
  for (let index = 0; index < flow.length; index += 1) {
    const item = flow[index];
    if (Array.isArray(item.sourceIds) && item.sourceIds.length) {
      const bad = item.sourceIds.filter((id) => !ctx.validIds.has(String(id)));
      if (bad.length) {
        return fail(`第 ${index + 1} 段流程（${textOf(item.phase)}）的 sourceIds 含非法 id：${bad.join('、')}`);
      }
    }
  }
  return { ok: true };
}

function localOutline(plan) {
  return {
    title: textOf(plan && plan.title),
    objectives: asArray(plan && plan.objectives).slice(0, 4).map((item) => ({
      text: textOf(item.text),
      level: textOf(item.level) || '理解',
      sourceIds: asArray(item.sourceIds)
    })),
    keyPoints: asArray(plan && plan.keyPoints).slice(0, 5),
    difficulties: asArray(plan && plan.difficulties).slice(0, 5),
    prerequisites: asArray(plan && plan.prerequisites).slice(0, 4).map((item) => ({
      nodeId: textOf(item.nodeId),
      label: textOf(item.label),
      misconception: textOf(item.misconception),
      sourceIds: asArray(item.sourceIds)
    })),
    flow: asArray(plan && plan.flow).map((item) => ({
      phase: textOf(item.phase),
      minutes: Number(item.minutes) || 1,
      focus: textOf(item.teacher) || textOf(item.student) || textOf(item.phase),
      sourceIds: asArray(item.sourceIds)
    }))
  };
}

async function runStage({ stage, settings, buildMessages, validate }) {
  const meta = STAGE_META[stage];
  const trace = {
    stage,
    label: meta.label,
    engine: 'llm',
    status: 'ok',
    latencyMs: 0
  };
  const started = Date.now();

  try {
    const result = await callChat({
      settings,
      messages: buildMessages(),
      timeoutMs: meta.timeoutMs
    });
    let parsed = null;
    let error = '';

    if (result && result.ok) {
      parsed = parseJson(result.content);
      if (!parsed) {
        error = '模型返回内容不是合法 JSON 对象';
      } else {
        const verdict = validate(parsed);
        if (!verdict.ok) {
          parsed = null;
          error = verdict.error;
        }
      }
    } else {
      error = (result && result.error) || '模型请求失败';
    }

    if (!parsed) {
      const repair = await callChat({
        settings,
        messages: buildRepairMessages({
          stage,
          raw: result && result.content ? result.content : '',
          error
        }),
        timeoutMs: meta.timeoutMs
      });
      if (repair && repair.ok) {
        const fixed = parseJson(repair.content);
        if (!fixed) {
          error = '修复后内容仍不是合法 JSON';
        } else {
          const verdict = validate(fixed);
          if (verdict.ok) parsed = fixed;
          else error = verdict.error;
        }
      } else {
        error = (repair && repair.error) || error;
      }
    }

    trace.latencyMs = Date.now() - started;
    if (!parsed) {
      trace.engine = 'local';
      trace.status = 'fallback';
      trace.error = error || '模型输出未通过校验';
      return { ok: false, error: trace.error, trace };
    }
    return { ok: true, data: parsed, trace };
  } catch (err) {
    trace.engine = 'local';
    trace.status = 'fallback';
    trace.latencyMs = Date.now() - started;
    trace.error = err && err.message ? err.message : '环节执行失败';
    return { ok: false, error: trace.error, trace };
  }
}

export async function runPlanAgent({
  settings,
  request,
  scenario,
  retrieved,
  localPlan,
  applyDraft,
  qualityCheck,
  onTrace
} = {}) {
  const llm = (settings && settings.llm) || {};
  const model = textOf(llm.model);
  const agent = {
    mode: 'local',
    enabled: false,
    model,
    promptVersion: PROMPT_VERSION,
    degraded: false,
    stages: []
  };

  const emit = (trace) => {
    if (!trace) return;
    agent.stages.push(trace);
    if (typeof onTrace === 'function') {
      try {
        onTrace(trace);
      } catch (err) {
        /* 轨迹回调失败不影响生成 */
      }
    }
  };

  if (!localPlan || !scenario) {
    return { plan: localPlan, agent };
  }

  if (!textOf(llm.apiKey)) {
    // 本地模式也记录轨迹，方便界面说明当前没有调用模型。
    agent.model = '';
    emit({ stage: 'outline', label: STAGE_META.outline.label, engine: 'local', status: 'ok', latencyMs: 0 });
    emit({ stage: 'compose', label: STAGE_META.compose.label, engine: 'local', status: 'ok', latencyMs: 0 });
    emit({ stage: 'check', label: STAGE_META.check.label, engine: 'local', status: 'ok', latencyMs: 0 });
    localPlan.agent = agent;
    return { plan: localPlan, agent };
  }

  const profile = stageProfile((request && request.stage) || scenario.stage);
  const duration = Number(request && request.duration) || profile.defaultDuration;
  const ctx = {
    duration,
    validIds: new Set(asArray(scenario.sources).map((source) => source.id)),
    nodeIds: new Set(asArray(scenario.graph && scenario.graph.nodes).map((node) => node.id))
  };
  const canApply = typeof applyDraft === 'function' && typeof qualityCheck === 'function';

  agent.enabled = true;
  agent.mode = 'agent';

  try {
    /* 环节 1：生成方案骨架 */
    const outlineResult = await runStage({
      stage: 'outline',
      settings,
      buildMessages: () => buildOutlineMessages({ request, scenario, retrieved, profile }),
      validate: (data) => validateOutline(data, ctx)
    });
    const outline = outlineResult.ok ? outlineResult.data : localOutline(localPlan);
    if (!outlineResult.ok) agent.degraded = true;
    emit(outlineResult.trace);

    /* 环节 2：生成完整方案 */
    const composeResult = await runStage({
      stage: 'compose',
      settings,
      buildMessages: () => buildComposeMessages({ request, scenario, retrieved, outline }),
      validate: (data) => validatePlan(data, ctx)
    });
    let plan = localPlan;
    if (composeResult.ok && canApply) {
      try {
        plan = applyDraft(localPlan, composeResult.data, scenario, settings, retrieved);
      } catch (err) {
        plan = localPlan;
        composeResult.ok = false;
        composeResult.trace.engine = 'local';
        composeResult.trace.status = 'fallback';
        composeResult.trace.error = err && err.message ? err.message : '方案合并失败';
      }
    }
    if (!composeResult.ok || !canApply) agent.degraded = true;
    emit(composeResult.trace);

    /* 环节 3：本地质量检查 */
    const checkStarted = Date.now();
    if (typeof qualityCheck === 'function') {
      plan.quality = qualityCheck(plan, scenario);
    }
    emit({
      stage: 'check',
      label: STAGE_META.check.label,
      engine: 'local',
      status: 'ok',
      latencyMs: Date.now() - checkStarted
    });

    /* 环节 4：按质检提醒修订（只有 warn 才触发） */
    let warns = asArray(plan.quality).filter((item) => item && item.status === 'warn');
    if (plan.source === 'llm' && warns.length && canApply) {
      const reviseResult = await runStage({
        stage: 'revise',
        settings,
        buildMessages: () => buildReviseMessages({
          request,
          scenario,
          retrieved,
          plan,
          issues: warns
        }),
        validate: (data) => validatePlan(data, ctx)
      });

      if (reviseResult.ok) {
        try {
          const candidate = applyDraft(plan, reviseResult.data, scenario, settings, retrieved);
          candidate.quality = qualityCheck(candidate, scenario);
          const nextWarns = asArray(candidate.quality).filter((item) => item && item.status === 'warn').length;
          if (nextWarns <= warns.length) {
            plan = candidate;
            warns = asArray(plan.quality).filter((item) => item && item.status === 'warn');
          } else {
            reviseResult.trace.engine = 'local';
            reviseResult.trace.status = 'fallback';
            reviseResult.trace.error = `修订后提醒 ${nextWarns} 项，多于修订前 ${warns.length} 项，保留原方案。`;
            agent.degraded = true;
          }
        } catch (err) {
          reviseResult.trace.engine = 'local';
          reviseResult.trace.status = 'fallback';
          reviseResult.trace.error = err && err.message ? err.message : '修订方案合并失败';
          agent.degraded = true;
        }
      } else {
        agent.degraded = true;
      }
      emit(reviseResult.trace);
    }

    agent.mode = plan.source === 'llm' ? 'agent' : 'local';
    plan.agent = agent;
    return { plan, agent };
  } catch (err) {
    agent.mode = 'local';
    agent.degraded = true;
    if (!agent.stages.some((item) => item.stage === 'check')) {
      emit({ stage: 'check', label: STAGE_META.check.label, engine: 'local', status: 'ok', latencyMs: 0 });
    }
    localPlan.agent = agent;
    return { plan: localPlan, agent };
  }
}
