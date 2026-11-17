// 档案名显示：默认名（"我" / "Me"、"档案 2" / "Profile 2"）按当前界面语言显示；用户改过的名字原样显示。

const DEFAULT_SELF = ['我', 'Me'];
const NUMBERED = /^(?:档案|Profile)\s*(\d+)$/;

export function profileDisplayName(name: string, t: (key: 'profile.defaultName' | 'profile.newName', vars?: Record<string, string | number>) => string): string {
  const trimmed = name.trim();
  if (DEFAULT_SELF.includes(trimmed)) return t('profile.defaultName');
  const m = trimmed.match(NUMBERED);
  if (m) return t('profile.newName', { n: m[1] });
  return name;
}
