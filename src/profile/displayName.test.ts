import { describe, expect, it } from 'vitest';
import { profileDisplayName } from './displayName';

const dict = { zh: { 'profile.defaultName': '我', 'profile.newName': '档案 {n}' }, en: { 'profile.defaultName': 'Me', 'profile.newName': 'Profile {n}' } };
const tFor = (lang: 'zh' | 'en') => (k: 'profile.defaultName' | 'profile.newName', v?: Record<string, string | number>) =>
  dict[lang][k].replace('{n}', String(v?.n ?? ''));

describe('profileDisplayName', () => {
  it('默认名按界面语言显示', () => {
    expect(profileDisplayName('我', tFor('en'))).toBe('Me');
    expect(profileDisplayName('Me', tFor('zh'))).toBe('我');
    expect(profileDisplayName('档案 3', tFor('en'))).toBe('Profile 3');
  });
  it('用户改过的名字原样显示', () => {
    expect(profileDisplayName('妈妈', tFor('en'))).toBe('妈妈');
    expect(profileDisplayName('Mel', tFor('zh'))).toBe('Mel');
  });
});
