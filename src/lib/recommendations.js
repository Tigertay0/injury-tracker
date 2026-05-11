// Rule-based recommendations engine — PRD §2.6

export function generateRecommendations(data) {
  const { acwr, acwrZone, recoveryScore, recoveryZone, equipmentRisk, position, injuries } = data;
  const recs = [];

  // ACWR-based recommendations
  if (acwrZone === 'DANGER') {
    recs.push({
      priority: 1,
      category: 'Training Load',
      text: 'Your training load spike is significant. Reduce total weekly volume by 20-30% this week.',
      citation: 'Gabbett, 2016',
    });
    if (position === 'MID') {
      recs.push({
        priority: 2,
        category: 'Position-Specific',
        text: 'As a midfielder, replace one high-intensity session with low-intensity technical work. Ensure 48+ hours between hard sessions.',
        citation: 'Malone et al., 2019',
      });
    }
    if (position === 'FWD') {
      recs.push({
        priority: 2,
        category: 'Position-Specific',
        text: 'As a forward, your sprint workload is elevated. Cut sprint-dominant drills by 25% and add hamstring-focused warm-up protocols.',
        citation: 'Hulin et al., 2016',
      });
    }
  } else if (acwrZone === 'CAUTION') {
    recs.push({
      priority: 2,
      category: 'Training Load',
      text: 'You are in the caution zone. Avoid adding new high-intensity sessions this week. Maintain current load.',
      citation: 'Hulin et al., 2016',
    });
  } else if (acwrZone === 'UNDERTRAINING') {
    recs.push({
      priority: 2,
      category: 'Training Load',
      text: 'Your training load is low. Gradual detraining increases injury risk when you return. Build load by 10-15% per week.',
      citation: 'Gabbett, 2016',
    });
  } else if (acwrZone === 'SWEET_SPOT') {
    recs.push({
      priority: 3,
      category: 'Training Load',
      text: 'Your training load is in the sweet spot. Maintain this balance — you have the lowest injury risk.',
      citation: 'Hulin et al., 2016',
    });
  }

  // Recovery-based recommendations
  if (recoveryZone === 'POOR') {
    recs.push({
      priority: 1,
      category: 'Recovery',
      text: 'Your recovery score is low. Prioritize 8+ hours of sleep and consider a rest day before your next high-intensity session.',
      citation: 'Thomas et al., 2016',
    });
  } else if (recoveryZone === 'MODERATE') {
    recs.push({
      priority: 2,
      category: 'Recovery',
      text: 'Recovery is moderate. Focus on sleep quality and hydration. Consider lighter training today.',
      citation: 'Thomas et al., 2016',
    });
  }

  // Equipment-based recommendations
  if (equipmentRisk === 'VERY_HIGH') {
    recs.unshift({
      priority: 0,
      category: 'Equipment Alert',
      text: '⚠️ Your cleat-surface combination has very high injury risk. Change your cleats before your next session.',
      citation: 'Livesay et al., 2006',
    });
  } else if (equipmentRisk === 'HIGH') {
    recs.push({
      priority: 1,
      category: 'Equipment',
      text: 'Your cleat-surface pairing carries elevated ACL/ankle risk. Consider surface-appropriate cleats.',
      citation: 'Meyers & Barnhill, 2004',
    });
  }

  // Position-specific defaults
  if (position === 'GK' && !recs.some(r => r.category === 'Position-Specific')) {
    recs.push({
      priority: 3,
      category: 'Position-Specific',
      text: 'As a goalkeeper, incorporate shoulder stability and wrist strengthening into your warm-up routine.',
    });
  }
  if (position === 'DEF' && !recs.some(r => r.category === 'Position-Specific')) {
    recs.push({
      priority: 3,
      category: 'Position-Specific',
      text: 'Defenders face high ACL risk from directional changes. Include lateral movement warm-ups and hamstring eccentric exercises.',
      citation: 'Malone et al., 2019',
    });
  }

  // Sort by priority (0 = most urgent)
  recs.sort((a, b) => a.priority - b.priority);
  return recs.slice(0, 5); // top 5
}
