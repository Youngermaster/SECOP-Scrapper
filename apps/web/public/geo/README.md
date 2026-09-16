# Geo assets

`departamentos.geojson` — department polygons of Colombia, derived from DANE's Marco
Geoestadístico Nacional (MGN 2018) as published in
https://github.com/caticoa3/colombia_mapa (simplified). Coordinates rounded to 4 decimals;
properties reduced to `code` (DANE 2-digit code) and `name`.

Municipality centroids are not vendored: the scraper pulls them from DIVIPOLA
(`gdxc-w37w` on datos.gov.co) into `../data/geo.json`.
