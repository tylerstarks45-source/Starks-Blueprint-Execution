/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const records = app.findRecordsByFilter("tools", "name != 'Twin AI' && name != 'GoHighLevel' && name != 'TubeMagic' && name != 'ViddeOS AI' && name != 'CustomGPT' && name != 'Perspective Funnels' && name != 'Remixable' && name != 'FunnelCockpit' && name != 'KlickTipp' && name != 'Agent X' && name != 'AI Profit Sniper' && name != 'Fast SEO Hub' && name != 'DigiMember' && name != 'Millionaire Partnership' && name != 'AlgePrime' && name != 'AI Book Writer' && name != 'Trade Commander Copier' && name != 'Army2026 System' && name != 'GODII AI' && name != 'Clickfunnels AI' && name != 'Systeme.io' && name != 'Opllo AI' && name != 'Make AI' && name != 'Marblism' && name != 'Predis.ai' && name != 'Zebracat AI' && name != 'Relay.app' && name != 'SEO Engine' && name != 'Magai' && name != 'Albato AI' && name != 'GetResponse' && name != 'BabyLoveGrowth'");
  for (const record of records) {
    app.delete(record);
  }
}, (app) => {
  // Rollback: record data not stored, manual restore needed
})