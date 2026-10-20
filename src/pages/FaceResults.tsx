// 护肤结果页（开发中）：先列出按困扰得出的步骤。完整页面（早晚流程、每步 1 个首选 + 2 个备选、顶部搭配检查）见草案第 7 节。

import { Link } from 'react-router-dom';
import { useI18n, type Key } from '../i18n';
import { useProfiles } from '../profile/ProfileContext';
import { faceMedicalAlerts, migrateFace } from '../profile/faceQuestionnaire';
import { baseStatuses } from '../profile/questionnaire';
import { buildFaceSteps } from '../scoring/faceSteps';

export default function FaceResults() {
  const { t, tx } = useI18n();
  const { profile } = useProfiles();
  if (!profile?.face) {
    return (
      <main className="shell stack-lg" style={{ paddingTop: 32 }}>
        <p>{t('skinResults.empty')}</p>
        <Link className="btn btn-primary" to="/skin/quiz">{t('home.startSkin')}</Link>
      </main>
    );
  }
  const face = migrateFace(profile.face);
  const steps = buildFaceSteps(face, { statuses: baseStatuses(profile.base) });
  return (
    <main className="shell stack-lg" style={{ paddingTop: 32 }}>
      <h1 className="h1">{t('skinResults.title')}</h1>
      {faceMedicalAlerts(face).map((a, i) => <p key={i} className="notice" role="status">{tx(a)}</p>)}
      <ol>
        {steps.map((s) => (
          <li key={s.id}>
            {t(`category.${s.category}` as Key)} · {t(s.tier === 'basic' ? 'skinResults.basic' : 'skinResults.optional')}
          </li>
        ))}
      </ol>
      <Link to="/skin/quiz">{t('results.editQuiz')}</Link>
    </main>
  );
}
