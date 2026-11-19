/* мост: тип открытой панели для стилей */
(function(){ const oldHUD = hud; hud = function(dt){ oldHUD(dt); ov.dataset.kind = panel ? panel.kind : ''; }; })();
