// Middleware pentru verificarea dinamică a permisiunilor de Catalog
const checkCatalogPermission = (actionCode) => {
  return async (req, res, next) => {
    try {
      // 1. Încercăm să luăm tip_resursa din request (merge la GET, ADD și EDIT Definitie)
      let tipResursa = req.body.tip_resursa || req.query.tip_resursa;

      // 2. Dacă NU avem tip_resursa (ex: rutele de Variante/Subcategorii unde primim doar id sau definitie_id)
      if (!tipResursa) {
        let definitieId = req.body.definitie_id; // Frontend-ul trimite asta la addSubcategorie

        // Dacă nu avem definitie_id, înseamnă că e o rută de EDIT/DELETE cu ID în URL
        if (!definitieId && req.params.id) {
          if (req.path.includes("Subcategorie")) {
            // Aflăm id-ul părintelui pe baza id-ului variantei
            const [sub] = await global.db.execute(`SELECT definitie_id FROM S02_Catalog_Subcategorii WHERE id = ?`, [req.params.id]);
            if (sub.length > 0) definitieId = sub[0].definitie_id;
          } else {
            // E o rută de ștergere definiție
            const [def] = await global.db.execute(`SELECT tip_resursa FROM S02_Catalog_Definitii WHERE id = ?`, [req.params.id]);
            if (def.length > 0) tipResursa = def[0].tip_resursa;
          }
        }

        // Dacă am reușit să facem rost de definitie_id, luăm tip_resursa părintelui
        if (definitieId && !tipResursa) {
          const [def] = await global.db.execute(`SELECT tip_resursa FROM S02_Catalog_Definitii WHERE id = ?`, [definitieId]);
          if (def.length > 0) tipResursa = def[0].tip_resursa;
        }
      }

      // Dacă nici acum nu știm pe ce resursă operăm, dăm eroare
      if (!tipResursa) {
        return res.status(400).json({ message: "Nu s-a putut determina tipul resursei pentru verificarea permisiunilor." });
      }

      // 3. Mapăm tip_resursa (cum vine de la frontend) la denumirea modulelor din permisiunile tale JSON
      const moduleMap = {
        manopera: "manopere",
        material: "materiale",
        utilaj: "utilaje",
        transport: "transport", // sau "transporturi", depinde cum l-ai scris în S00_Permisiuni_Predefinite
      };

      const moduleCode = moduleMap[tipResursa] || tipResursa;

      // 4. Verificarea finală a permisiunilor
      const finalPerms = req.user.permissions;

      if (finalPerms?.superAdmin === true) return next();

      const moduleActions = finalPerms?.permisiuni?.[moduleCode] || "";
      if (moduleActions.includes(actionCode)) {
        return next();
      }

      return res.status(403).json({ message: "Acces interzis: Permisiuni insuficiente." });
    } catch (err) {
      console.error("Eroare la verificarea permisiunilor dinamice:", err);
      return res.status(500).json({ message: "Eroare internă la validarea accesului." });
    }
  };
};

module.exports = { checkCatalogPermission };
