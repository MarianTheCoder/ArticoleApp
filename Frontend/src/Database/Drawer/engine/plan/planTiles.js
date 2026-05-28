// Converts backend-relative path to absolute URL.
export function toApiUrl(path, baseURL) {
  if (!path) return "";

  try {
    return new URL(path, baseURL).href;
  } catch {
    return path;
  }
}

// Builds OpenSeadragon tile source from plan object.
export function buildPlanTileSource(plan, apiBaseURL) {
  const width = Number(plan?.width_px);
  const height = Number(plan?.height_px);

  if (!width || !height) return null;

  // Direct DZI source support.
  if (plan?.dzi_url) {
    return plan.dzi_url;
  }

  // Tile size from DB.
  const tileSize = Number(plan?.tile_size || 256);

  // Support both field names.
  const maxLevelFromPlan = Number(plan?.tiles_max_zoom ?? plan?.tiles_max_level);

  // Fallback max zoom level.
  const maxLevel = Number.isFinite(maxLevelFromPlan) ? maxLevelFromPlan : Math.ceil(Math.log2(Math.max(width, height)));

  // Absolute tile folder URL.
  const tilesBaseUrl = toApiUrl(plan?.tiles_base_url, apiBaseURL);

  if (!tilesBaseUrl) return null;

  return {
    width,
    height,
    tileSize,
    minLevel: 0,
    maxLevel,

    // Current tile format: /level/x_y.png
    getTileUrl(level, x, y) {
      return `${tilesBaseUrl}/${level}/${x}_${y}.png`;
    },
  };
}
