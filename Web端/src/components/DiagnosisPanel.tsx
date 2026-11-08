import { AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import type { QuizQuestion, SubmitDiagnosisResponse } from '../types';

interface Props {
  quiz: QuizQuestion[];
  answers: Record<string, string>;
  setAnswer: (questionId: string, answer: string) => void;
  submit: () => void;
  result: SubmitDiagnosisResponse | null;
  loading: boolean;
  retest: () => void;
}

export default function DiagnosisPanel({ quiz, answers, setAnswer, submit, result, loading, retest }: Props) {
  const completed = quiz.every(q => Boolean(answers[q.id]));
  return (
    <div className="diagnosis-layout">
      {!result ? <>
        <div className="notice"><AlertCircle size={17}/> 诊断题用于确认可能缺失的前置知识。单次答题不能替代正式学习评估。</div>
        {quiz.map((q, index) => (
          <section key={q.id} className="quiz-card">
            <div className="quiz-index">问题 {index + 1} / {quiz.length}</div>
            <h3>{q.prompt}</h3>
            <div className="option-list">
              {q.options.map(option => <label className={`quiz-option ${answers[q.id] === option.value ? 'selected' : ''}`} key={option.value}>
                <input type="radio" name={q.id} value={option.value} checked={answers[q.id] === option.value} onChange={() => setAnswer(q.id, option.value)}/>
                <span>{option.label}</span>
              </label>)}
            </div>
          </section>
        ))}
        <button className="primary-button" disabled={!completed || loading} onClick={submit}>{loading ? '正在分析…' : '提交诊断，生成学习路径'}</button>
      </> : <>
        <div className="result-banner">
          <div><div className="overline">诊断结果</div><h3>{result.accuracyText}</h3><p>{result.advice}</p></div>
          <CheckCircle2 size={32}/>
        </div>
        <h3>疑似知识断点</h3>
        {result.weakPoints.length === 0 ? <p className="muted">本次没有检测到明显的基础概念错误，建议尝试更具挑战性的迁移题。</p> : (
          <div className="weakpoint-list">{result.weakPoints.map(point => <div className="weakpoint" key={point.id}><strong>{point.title}</strong><span>{point.reason}</span></div>)}</div>
        )}
        <h3>个性化补救学习路径</h3>
        <div className="path-list">{result.learningPath.map((step, i) => <div className="path-step" key={step.id}>
          <div className="path-index">{i + 1}</div><div><div className="path-title"><strong>{step.title}</strong><span>{step.duration}</span></div><p>{step.description}</p></div>
        </div>)}</div>
        <button className="outline-button" disabled={loading} onClick={retest}><RotateCcw size={16}/>{loading ? '正在准备…' : '进入下一轮复测'}</button>
      </>}
    </div>
  );
}
