/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const records = app.findRecordsByFilter("tools", "name='Pollo AI' || name='Predis.ai' || name='Zebracat AI' || name='Viddeos AI' || name='TubeMagic' || name='AI Book Writer' || name='Make.com' || name='Albato AI' || name='Relay.app' || name='Magai' || name='GoHighLevel' || name='GetResponse' || name='KlickTipp' || name='Perspective Funnels' || name='ClickFunnels AI' || name='Systeme.io' || name='SEO Engine' || name='FastSEOHub' || name='CustomGPT' || name='Twin AI' || name='AgentX' || name='BabyLoveGrowth' || name='Remixable' || name='Digimember' || name='AlgePrime' || name='QC System' || name='FunnelCockpit' || name='AI Profit Sniper' || name='Trade Commander'");
  for (const record of records) {
    app.delete(record);
  }
}, (app) => {
  // Rollback: record data not stored, manual restore needed
})