const getReteteFromOfertaForSarcina = async (req, res) => {
    const { id } = req.params; // oferta_parts_id

    try {
        // 1) Retetele din ofertă (exact ca la tine)
        const [reteteRows] = await global.db.execute(
            `
      SELECT id, limba, articol_client, reper_plan, detalii_aditionale, oferta_parts_id,
             cod_reteta AS cod, clasa_reteta AS clasa, original_reteta_id,
             articol, articol_fr, descriere_reteta AS descriere, descriere_reteta_fr AS descriere_fr,
             unitate_masura, cantitate, sort_order
        FROM Santier_retete
       WHERE oferta_parts_id = ?
       ORDER BY sort_order ASC
      `,
            [id]
        );

        // 2) Reper info
        const [[reperRow]] = await global.db.execute(
            `SELECT reper1, reper2 FROM oferta_parts WHERE id = ?`,
            [id]
        );

        // 3) Toate alocările din sarcini pentru acest oferta_parts_id (sumar + breakdown per sarcină)
        const [allocSummary] = await global.db.execute(
            `
      SELECT santier_reteta_id,
             SUM(cantitate_alocata)       AS allocated_total,
             SUM(cantitate_executata)     AS executed_total,
             COUNT(*)                     AS rows_count
        FROM S07_Sarcina_Reteta
       WHERE oferta_parts_id = ?
       GROUP BY santier_reteta_id
      `,
            [id]
        );

        const [allocBreakdown] = await global.db.execute(
            `
      SELECT santier_reteta_id, sarcina_id, cantitate_alocata, cantitate_executata
        FROM S07_Sarcina_Reteta
       WHERE oferta_parts_id = ?
      `,
            [id]
        );

        // indexări rapide în memorie
        const summaryByReteta = new Map();
        allocSummary.forEach(r => {
            summaryByReteta.set(Number(r.santier_reteta_id), {
                allocated_total: Number(r.allocated_total || 0),
                executed_total: Number(r.executed_total || 0),
                rows_count: Number(r.rows_count || 0),
            });
        });

        const breakdownByReteta = new Map();
        allocBreakdown.forEach(r => {
            const key = Number(r.santier_reteta_id);
            if (!breakdownByReteta.has(key)) breakdownByReteta.set(key, []);
            breakdownByReteta.get(key).push({
                sarcina_id: Number(r.sarcina_id),
                cantitate_alocata: Number(r.cantitate_alocata || 0),
                cantitate_executata: Number(r.cantitate_executata || 0),
            });
        });

        // 4) Costuri (exact ca la tine)
        const results = [];
        const costs = {};

        for (const reteta of reteteRows) {
            const santier_reteta_id = reteta.id;
            let totalCost = 0;

            costs[santier_reteta_id] = {
                Manopera: {},
                Material: {},
                Transport: {},
                Utilaj: {},
                cantitate_reteta: reteta.cantitate,
            };

            // === MANOPERA ===
            const [manopera] = await global.db.execute(`
        SELECT d.id AS def_id, d.cantitate, c.id AS child_id, COALESCE(c.cost_unitar, d.cost_unitar) AS cost
          FROM Santier_Retete_Manopera_Definition d
          LEFT JOIN Santier_Retete_Manopera c ON c.definitie_id = d.id
         WHERE d.santier_reteta_id = ?
      `, [santier_reteta_id]);

            // NEW: sumăm doar cantitatea din Definition (d.cantitate)
            let manoperaQtyDefTotal = 0;

            manopera.forEach(({ def_id, child_id, cost, cantitate }) => {
                const key = child_id ?? def_id;
                totalCost += Number(cost) * Number(cantitate);
                costs[santier_reteta_id].Manopera[key] = { cost: Number(cost), cantitate: Number(cantitate) };

                // adunăm cantitatea din DEF
                manoperaQtyDefTotal += Number(cantitate) || 0;
            });

            // === MATERIALE ===
            const [materiale] = await global.db.execute(`
        SELECT d.id AS def_id, d.cantitate, c.id AS child_id, COALESCE(c.pret_vanzare, d.pret_vanzare) AS cost
          FROM Santier_Retete_Materiale_Definition d
          LEFT JOIN Santier_Retete_Materiale c ON c.definitie_id = d.id
         WHERE d.santier_reteta_id = ?
      `, [santier_reteta_id]);

            materiale.forEach(({ def_id, child_id, cost, cantitate }) => {
                const key = child_id ?? def_id;
                totalCost += Number(cost) * Number(cantitate);
                costs[santier_reteta_id].Material[key] = { cost: Number(cost), cantitate: Number(cantitate) };
            });

            // === TRANSPORT ===
            const [transport] = await global.db.execute(`
        SELECT d.id AS def_id, d.cantitate, c.id AS child_id, COALESCE(c.cost_unitar, d.cost_unitar) AS cost
          FROM Santier_Retete_Transport_Definition d
          LEFT JOIN Santier_Retete_Transport c ON c.definitie_id = d.id
         WHERE d.santier_reteta_id = ?
      `, [santier_reteta_id]);

            transport.forEach(({ def_id, child_id, cost, cantitate }) => {
                const key = child_id ?? def_id;
                totalCost += Number(cost) * Number(cantitate);
                costs[santier_reteta_id].Transport[key] = { cost: Number(cost), cantitate: Number(cantitate) };
            });

            // === UTILAJE ===
            const [utilaje] = await global.db.execute(`
        SELECT d.id AS def_id, d.cantitate, c.id AS child_id, COALESCE(c.pret_utilaj, d.pret_utilaj) AS cost
          FROM Santier_Retete_Utilaje_Definition d
          LEFT JOIN Santier_Retete_Utilaje c ON c.definitie_id = d.id
         WHERE d.santier_reteta_id = ?
      `, [santier_reteta_id]);

            utilaje.forEach(({ def_id, child_id, cost, cantitate }) => {
                const key = child_id ?? def_id;
                totalCost += Number(cost) * Number(cantitate);
                costs[santier_reteta_id].Utilaj[key] = { cost: Number(cost), cantitate: Number(cantitate) };
            });

            // 5) Îmbogățire cu alocări din sarcini
            const sum = summaryByReteta.get(santier_reteta_id) || {
                allocated_total: 0, executed_total: 0, rows_count: 0,
            };
            const allocations = breakdownByReteta.get(santier_reteta_id) || [];
            const remaining_qty = Number(reteta.cantitate) - Number(sum.allocated_total);
            const already_added = sum.rows_count > 0 ? 1 : 0;

            results.push({
                ...reteta,
                cost: totalCost.toFixed(2),

                allocated_total: Number(sum.allocated_total.toFixed ? sum.allocated_total : +sum.allocated_total),
                executed_total: Number(sum.executed_total.toFixed ? sum.executed_total : +sum.executed_total),
                remaining_qty: Number(remaining_qty < 0 ? 0 : remaining_qty),
                already_added,

                // NEW: cantitatea de manoperă din Definition
                manopera_qty: Number(manoperaQtyDefTotal),

                allocations, // [{ sarcina_id, cantitate_alocata, cantitate_executata }, ...]
            });
        }

        res.status(200).json({
            data: results,
            detailedCosts: costs,
            reper: reperRow ?? null,
        });
    } catch (err) {
        console.error("Error getting retete with prices:", err);
        res.status(500).json({ error: "Database error" });
    }
};


// body: { db: [{ id, qty }], oferta: [{ id, qty }] }
const getMaterialeForSelectedRetete = async (req, res) => {
    const connection = await global.db.getConnection();
    try {
        await connection.beginTransaction();

        const { db = [], oferta = [] } = req.body || {};
        if ((!db?.length) && (!oferta?.length)) {
            await connection.commit();
            return res.json({ rows: [], grouped_all: [] });
        }

        // Build inline (id, qty) list
        const buildPairs = (pairs) => {
            if (!pairs?.length) return { ph: "(SELECT 0 AS id, 0 AS qty) sel", params: [] };
            const parts = [], params = [];
            pairs.forEach(({ id, qty }, i) => {
                parts.push(i === 0 ? "SELECT ? AS id, ? AS qty" : "UNION ALL SELECT ?, ?");
                params.push(Number(id) || 0, Number(qty) || 0);
            });
            return { ph: `(${parts.join(" ")}) sel`, params };
        };

        const dbInline = buildPairs(db);
        const ofInline = buildPairs(oferta);

        // ---------------- DB Retete ----------------
        // Emits a unified schema. No child on this path → child-only fields are NULL.
        const dbSql = `
      SELECT
        'db'                        AS source,
        r.id                       AS reteta_id,
        r.cod_reteta               AS reteta_cod,
        r.clasa_reteta             AS reteta_clasa,
        r.articol                  AS reteta_articol,

        md.id                      AS material_id,         -- final id
        md.cod_definitie           AS cod,                 -- final code
        md.denumire                AS denumire,
        md.denumire_fr             AS denumire_fr,
        md.descriere               AS descriere,
        md.descriere_fr            AS descriere_fr,
        md.clasa_material          AS clasa_material,
        md.tip_material            AS tip_material,
        md.photoUrl                AS photoUrl,            -- final photo
        md.unitate_masura          AS unitate_masura,

        NULL                       AS cost_unitar,         -- child-only
        NULL                       AS cost_preferential,   -- child-only
        md.pret_vanzare            AS pret_vanzare,        -- final price
        NULL                       AS furnizor,            -- child-only
        NULL                       AS original_material_id, -- child-only

        rm.cantitate               AS qty_per_reteta,
        sel.qty                    AS alloc_qty,
        (rm.cantitate * sel.qty)   AS total_qty
      FROM ${dbInline.ph}
      JOIN Retete r
        ON r.id = sel.id
      JOIN Retete_materiale rm
        ON rm.reteta_id = r.id
      JOIN Materiale_Definition md
        ON md.id = rm.materiale_definitie_id
    `;

        // ---------------- Ofertă / Santier ----------------
        // LEFT JOIN single child; override final fields with child if exists.
        const ofertaSql = `
      SELECT
        'oferta'                   AS source,
        r.id                      AS reteta_id,
        r.cod_reteta              AS reteta_cod,
        r.clasa_reteta            AS reteta_clasa,
        r.articol                 AS reteta_articol,

        COALESCE(ch.id, def.id)                 AS material_id,       -- override
        COALESCE(ch.cod_material, def.cod_definitie) AS cod,          -- override
        def.denumire                              AS denumire,
        def.denumire_fr                           AS denumire_fr,
        COALESCE(ch.descriere, def.descriere)     AS descriere,        -- override
        COALESCE(ch.descriere_fr, def.descriere_fr) AS descriere_fr,  -- override
        def.clasa_material                        AS clasa_material,
        def.tip_material                          AS tip_material,
        COALESCE(ch.photoUrl, def.photoUrl)       AS photoUrl,        -- override
        def.unitate_masura                        AS unitate_masura,

        ch.cost_unitar                             AS cost_unitar,     -- child price details
        ch.cost_preferential                       AS cost_preferential,
        COALESCE(ch.pret_vanzare, def.pret_vanzare) AS pret_vanzare,  -- final price
        ch.furnizor                                AS furnizor,        -- child supplier
        ch.original_material_id                    AS original_material_id,

        def.cantitate             AS qty_per_reteta,
        sel.qty                   AS alloc_qty,
        (def.cantitate * sel.qty) AS total_qty
      FROM ${ofInline.ph}
      JOIN Santier_retete r
        ON r.id = sel.id
      JOIN Santier_Retete_Materiale_Definition def
        ON def.santier_reteta_id = r.id
      LEFT JOIN Santier_Retete_Materiale ch
        ON ch.definitie_id = def.id
    `;

        const [dbRows] = await connection.query(dbSql, dbInline.params);
        const [ofRows] = await connection.query(ofertaSql, ofInline.params);
        const rows = [...dbRows, ...ofRows];

        // ------------- grouping across both sources -------------
        // Same material iff: furnizor (final), cod (final), denumire (final), pret_vanzare (final)
        const norm = (s) => (s ?? "").toString().trim().toUpperCase();
        const priceKey = (v) => Number(v || 0).toFixed(3);

        const groupedMap = new Map();
        for (const r of rows) {
            const key = [norm(r.furnizor), norm(r.cod), norm(r.denumire), priceKey(r.pret_vanzare)].join("|");
            if (!groupedMap.has(key)) {
                groupedMap.set(key, {
                    furnizor: r.furnizor || null,
                    cod: r.cod,
                    denumire: r.denumire,
                    denumire_fr: r.denumire_fr,
                    descriere: r.descriere,
                    descriere_fr: r.descriere_fr,
                    clasa_material: r.clasa_material,
                    tip_material: r.tip_material,
                    photoUrl: r.photoUrl,
                    unitate_masura: r.unitate_masura,
                    pret_vanzare: Number(r.pret_vanzare || 0),
                    total_qty: 0,
                });
            }
            groupedMap.get(key).total_qty += Number(r.total_qty || 0);
        }
        const grouped_all = Array.from(groupedMap.values());

        await connection.commit();
        res.json({ rows, grouped_all });
    } catch (err) {
        await connection.rollback();
        console.error("materialsForSelection error:", err);
        res.status(500).json({ error: "Database error" });
    } finally {
        connection.release();
    }
};

module.exports = { getReteteFromOfertaForSarcina, getMaterialeForSelectedRetete };