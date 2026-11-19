/* Plain JS / Canvas 2D. Load manifest.js before this file. No changes to gameplay. */
window.createCordonSpritesB1 = function (atlasImage, manifest = window.CordonSpritesB1) {
  function draw(ctx, id, x, y, width, height, angle) {
    const s = manifest.sprites[id];
    if (!s || !atlasImage.complete || !atlasImage.naturalWidth) return false;
    const [sx, sy, sw, sh] = s.rect;
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.translate(x, y);
    if (angle != null && s.facingRadians != null) ctx.rotate(angle - s.facingRadians);
    ctx.drawImage(atlasImage, sx, sy, sw, sh, -width * s.pivot[0], -height * s.pivot[1], width, height);
    ctx.restore(); return true;
  }
  return {
    drawWorld(ctx, id, x, y, angle, equippedWeapon) {
      const s = manifest.sprites[id];
      if (!s || s.facingRadians == null || (s.bakedWeapon && equippedWeapon !== s.bakedWeapon)) return false;
      return draw(ctx, id, x, y, ...s.logicalSize, angle);
    },
    drawIcon(ctx, id, x, y, width, height) {
      const s = manifest.sprites[id]; if (!s) return false;
      const [w,h] = s.logicalSize, scale = Math.min(width/w,height/h);
      return draw(ctx,id,x+width/2,y+height/2,w*scale,h*scale,null);
    }
  };
};
