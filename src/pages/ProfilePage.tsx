// 档案页：多份档案切换（"我" / "帮别人测"）、改名、删除、特殊状态（单独入口，不在首次问卷中出现）。

import { useI18n, type Key } from '../i18n';
import { useProfiles } from '../profile/ProfileContext';
import { baseStatuses } from '../profile/questionnaire';
import type { SpecialStatus } from '../scoring/score';

const STATUSES: SpecialStatus[] = ['pregnant', 'trying', 'breastfeeding', 'rx', 'isotretinoin'];

export default function ProfilePage() {
  const { t } = useI18n();
  const { store, profile, save, remove, add, switchTo } = useProfiles();

  if (!profile) {
    return (
      <main className="shell stack-lg" style={{ paddingTop: 32 }}>
        <h1 className="h1">{t('profile.title')}</h1>
        <button type="button" className="btn btn-primary" onClick={() => add(t('profile.defaultName'))}>
          + {t('profile.defaultName')}
        </button>
      </main>
    );
  }
  const p = profile;
  const statuses = baseStatuses(p.base);
  const setStatuses = (list: SpecialStatus[]) =>
    save({ ...p, base: { ...p.base, specialStatuses: list, specialStatus: list[0] ?? 'none' } });

  return (
    <main className="shell stack-lg" style={{ paddingTop: 32 }}>
      <h1 className="h1">{t('profile.title')}</h1>

      <section>
        <div className="label">{t('profile.current')}</div>
        <div className="options" role="radiogroup">
          {store.profiles.map((x) => (
            <button key={x.id} type="button" role="radio" aria-checked={x.id === p.id} className="option" onClick={() => switchTo(x.id)}>
              <span className="mark" aria-hidden="true" />
              <span className="opt-text">{x.name}</span>
            </button>
          ))}
        </div>
        <button type="button" className="textbtn" style={{ marginTop: 12 }} onClick={() => add(t('profile.newName', { n: store.profiles.length + 1 }))}>
          + {t('profile.add')}
        </button>
      </section>

      <section className="panel">
        <label className="label" htmlFor="profile-name">{t('profile.name')}</label>
        <div className="field">
          <input id="profile-name" className="input" value={p.name} onChange={(e) => save({ ...p, name: e.target.value })} />
        </div>
      </section>

      <section className="panel">
        <div className="label">{t('profile.special')}</div>
        <p className="small muted" style={{ marginTop: 6 }}>{t('profile.specialHint')}</p>
        {/* 可多选；"无"清空其他选项。specialStatus 保留第一个选项，兼容旧版本读取 */}
        <div className="options">
          <button
            type="button"
            aria-pressed={statuses.length === 0}
            className="option multi"
            onClick={() => setStatuses([])}
          >
            <span className="mark" aria-hidden="true" />
            <span className="opt-text">{t('special.none')}</span>
          </button>
          {STATUSES.map((s) => {
            const on = statuses.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                className="option multi"
                onClick={() => setStatuses(on ? statuses.filter((x) => x !== s) : [...statuses, s])}
              >
                <span className="mark" aria-hidden="true" />
                <span className="opt-text">{t(`special.${s}` as Key)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <button type="button" className="btn btn-danger" onClick={() => remove(p.id)}>{t('profile.delete')}</button>
    </main>
  );
}
