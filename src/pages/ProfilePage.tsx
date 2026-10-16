// 档案页：改名、删除、特殊状态（单独入口，不在首次问卷中出现）。

import { useI18n, type Key } from '../i18n';
import { useProfiles } from '../profile/ProfileContext';
import type { SpecialStatus } from '../scoring/score';

const STATUSES: SpecialStatus[] = ['none', 'pregnant', 'trying', 'breastfeeding', 'rx'];

export default function ProfilePage() {
  const { t } = useI18n();
  const { profile, save, remove, add } = useProfiles();

  if (!profile) {
    return (
      <main>
        <h2>{t('profile.title')}</h2>
        <button type="button" className="primary" onClick={() => add(t('profile.defaultName'))}>
          + {t('profile.defaultName')}
        </button>
      </main>
    );
  }
  const p = profile;

  return (
    <main>
      <h2>{t('profile.title')}</h2>
      <section className="card">
        <label className="q" htmlFor="profile-name">{t('profile.name')}</label>
        <input id="profile-name" value={p.name} onChange={(e) => save({ ...p, name: e.target.value })} />
      </section>

      <section className="card">
        <h3>{t('profile.special')}</h3>
        <p className="muted small">{t('profile.specialHint')}</p>
        <div className="choices" role="radiogroup">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={p.base.specialStatus === s}
              className={p.base.specialStatus === s ? 'chip selected' : 'chip'}
              onClick={() => save({ ...p, base: { ...p.base, specialStatus: s } })}
            >
              {t(`special.${s}` as Key)}
            </button>
          ))}
        </div>
      </section>

      <button type="button" className="danger" onClick={() => remove(p.id)}>{t('profile.delete')}</button>
    </main>
  );
}
