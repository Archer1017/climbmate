import type { ChecklistItem, ClimbingType, Environment } from './types';
export const GEAR_DISCLAIMER =
  '清单仅供辅助准备，不能替代专业培训、制造商说明、同行检查或现场安全判断。装备应按真实路线、保护系统和场馆要求配置。';
export function generateChecklist(type: ClimbingType, environment: Environment): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const add = (
    id: string,
    name: string,
    category: ChecklistItem['category'],
    critical = false,
    note = '',
  ) => {
    items.push({ id, name, category, critical, checked: false, note });
  };
  add('shoes', '攀岩鞋', 'basic');
  add('chalk', '粉袋与镁粉', 'basic', false, '遵守场馆或岩场对镁粉的要求');
  add('water', '饮用水与补给', 'basic');
  add('warmup', '热身与身体状况确认', 'planning');
  if (type === 'bouldering') {
    if (environment === 'outdoor') {
      add(
        'pads',
        '抱石垫与落地区域确认',
        'safety',
        true,
        '按落地区域与线路实际情况安排足够垫子和受过训练的同行',
      );
      add('spotting', '同行与保护安排', 'planning', true);
    } else add('gym-rules', '场馆落地区域与抱石规则确认', 'safety', true);
  } else {
    add('harness', '安全带', 'safety', true, '按制造商说明检查与使用');
    add('belay', '保护系统与搭档检查', 'safety', true, '使用经培训且与装备相容的保护方式');
    if (environment === 'outdoor') {
      add('helmet', '攀岩头盔', 'safety', true);
      add('rope', '适配路线的绳索', 'safety', true, '确认长度、状态及整套系统的适用性');
      add('device', '保护器与配套锁扣', 'safety', true);
      if (type === 'sport') add('quickdraws', '适配线路的快挂', 'safety', true);
      if (type === 'trad')
        add(
          'trad-rack',
          '根据真实线路配置传统保护器材',
          'safety',
          true,
          '通用清单不构成完整器材配置或教学',
        );
    } else
      add(
        'gym-equipment',
        '按场馆规则确认所需保护装备',
        'safety',
        true,
        '确认顶绳、先锋或自动保护的准入与使用要求',
      );
  }
  if (environment === 'outdoor') {
    add('weather', '核查天气、降雨与岩壁状况', 'planning', true, '当前未接入实时天气，请自行核实');
    add('access', '核实岩场开放与通行条件', 'planning', true, '当前未接入开放状态或地图服务');
    add('return', '交通、返程与紧急联系人', 'planning', true);
    add('layers', '适合天气的衣物与防晒', 'outdoor');
    add('first-aid', '急救用品与通讯电量', 'outdoor', true);
    add('leave-no-trace', '垃圾袋与无痕离开', 'outdoor');
  }
  return items;
}
export function checklistProgress(items: ChecklistItem[]): number {
  return items.length
    ? Math.round((items.filter((item) => item.checked).length / items.length) * 100)
    : 0;
}
