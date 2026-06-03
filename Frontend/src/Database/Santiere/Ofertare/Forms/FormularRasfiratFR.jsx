import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import * as customVfsModule from '../../../../assets/fonts/vfs_fonts.js';
import { folderImage, logo, userImage, materialeImage, utilajeImage, transportImage } from '../../base64Items';
import api from '../../../../api/axiosAPI';
// margin: [0, 7.5, 10, 5] left top right bottom

pdfMake.vfs = customVfsModule.default

// 3) Now register the Avenir font family:
pdfMake.fonts = {
  Avenir: {
    normal: 'Avenir_Regular.otf',
    bold: 'Avenir_Bold.otf',
    italics: 'Avenir_Italic.otf',
    bolditalics: 'Avenir_Italic.otf'    // reuse Italic for bold+italic
  }
};


function formatPrice(num) {
  if (num == null || isNaN(num)) return "";
  return Number(num).toLocaleString("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}


export const FormularRasfiratFR = async (id, recapitulatii, TVA, reper1, reper2) => {
  let res;
  let santierDetails;
  // console.log("FormularRasfiratFR called with id:", id, "recapitulatii:", recapitulatii, "TVA:", TVA, "reper1:", reper1, "reper2:", reper2);
  try {
    res = await api.get(`/Formulare/generareRasfirat/${id}`, {
      params: {
        recapitulatii: recapitulatii,
        TVA: TVA
      }
    });
  } catch (error) {
    console.log(error);
    return;
  }
  // console.log(santierDetails.data.santierDetails[0]);
  // console.log(detalii);
  let dataTable = res.data.data;
  const {
    totalManoperaOre,
    totalManoperaPret,
    totalMaterialePret,
    totalUtilajePret,
    totalTransportPret
  } = res.data;

  const {
    ofertaPartName,
    ofertaName,
    santierName,
    santiereDetalii
  } = res.data;


  const tableBody = [
    [
      { text: 'Non.', style: 'mainHeader' },
      { text: 'Image', style: 'mainHeader' },
      { text: reper1, style: 'mainHeader' },
      { text: reper2, style: 'mainHeader' },
      { text: 'Code', style: 'mainHeader' },
      { text: 'Classe', style: 'mainHeader' },
      { text: 'Article', style: 'mainHeader' },
      { text: 'Description', style: 'mainHeader' },
      { text: 'Unité', style: 'mainHeader' },
      { text: 'Quantité', style: 'mainHeader' },
      { text: 'Prix unitaire \n (EUR)', style: 'mainHeader' },
      { text: 'Prix total \n (EUR)', style: 'mainHeader' }
    ],
    ...dataTable.flatMap((item, index) => {
      const rowFill = "#ffffff";
      let finalIndex = 0;
      // Row pentru reteta
      const retetaRow = [
        { text: `${index + 1}`, fillColor: "#e5e5e5", alignment: 'left', style: 'mainCell' },
        { image: folderImage, width: 10, height: 10, alignment: 'center', fillColor: "#e5e5e5" },
        { text: item.detalii_aditionale || '', fillColor: "#e5e5e5", style: 'mainCell' },
        { text: item.reper_plan || '', fillColor: "#e5e5e5", style: 'mainCell' },
        { text: item.cod_reteta || '', fillColor: "#e5e5e5", style: 'mainCell' },
        { text: item.clasa_reteta || '', fillColor: "#e5e5e5", style: 'mainCell' },
        { text: item.articol_fr || '', fillColor: "#e5e5e5", style: 'mainCell' },
        { text: item.descriere_fr || item.descriere_reteta_fr || '', fillColor: "#e5e5e5", style: 'mainCell' },
        { text: item.unitate_masura || '', fillColor: "#e5e5e5", alignment: 'center', style: 'mainCell' },
        { text: formatPrice(item.cantitate) || '', fillColor: "#e5e5e5", alignment: 'right', style: 'mainCell', bold: true },
        { text: formatPrice(item.cost) || '', fillColor: "#e5e5e5", alignment: 'right', style: 'mainCell', bold: true },
        {
          text: formatPrice(parseFloat(item.cost) * parseFloat(item.cantitate)) || '',
          fillColor: "#e5e5e5",
          alignment: 'right',
          noWrap: true,
          bold: true,
          style: 'mainCell'
        }
      ];

      // Sub-randuri pentru manopera
      const manoperaRows = item.Manopera
        ? Object.values(item.Manopera).map((mItem, mindex) => [
          { text: `${index + 1}.${mindex + 1}`, fillColor: rowFill, alignment: 'left', style: 'mainCell' },
          { image: userImage, width: 10, height: 10, alignment: 'center' },
          { text: '', fillColor: rowFill, style: 'mainCell' },
          { text: '', fillColor: rowFill, style: 'mainCell' },
          { text: mItem.cod || '', fillColor: rowFill, style: 'mainCell' },
          { text: mItem.clasa || '', fillColor: rowFill, style: 'mainCell' },
          { text: mItem.articol_fr || '', fillColor: rowFill, style: 'mainCell' },
          { text: mItem.descriere_fr || '', fillColor: rowFill, style: 'mainCell' },
          { text: mItem.unitate_masura || '', fillColor: rowFill, alignment: 'center', style: 'mainCell' },
          { text: formatPrice(mItem.cantitate) || '', fillColor: rowFill, alignment: 'right', style: 'mainCell' },
          { text: formatPrice(mItem.cost) || '', fillColor: rowFill, alignment: 'right', style: 'mainCell' },
          {
            text: formatPrice(parseFloat(mItem.cost) * parseFloat(mItem.cantitate)) || '',
            fillColor: rowFill,
            alignment: 'right',
            noWrap: true,
            style: 'mainCell'
          }
        ])
        : [];
      // add the manopere
      finalIndex += Object.keys(item.Manopera || {}).length;

      const materialeRows = item.Material
        ? Object.values(item.Material).map((mItem, mindex) => [
          { text: `${index + 1}.${finalIndex + mindex + 1}`, fillColor: rowFill, alignment: 'left', style: 'mainCell' },
          { image: materialeImage, width: 10, height: 10, alignment: 'center' },
          { text: '', fillColor: rowFill, style: 'mainCell' },
          { text: '', fillColor: rowFill, style: 'mainCell' },
          { text: mItem.cod || '', fillColor: rowFill, style: 'mainCell' },
          { text: mItem.clasa || '', fillColor: rowFill, style: 'mainCell' },
          { text: mItem.articol_fr || '', fillColor: rowFill, style: 'mainCell' },
          { text: mItem.descriere_fr || '', fillColor: rowFill, style: 'mainCell' },
          { text: mItem.unitate_masura || '', fillColor: rowFill, alignment: 'center', style: 'mainCell' },
          { text: formatPrice(mItem.cantitate) || '', fillColor: rowFill, alignment: 'right', style: 'mainCell' },
          { text: formatPrice(mItem.cost) || '', fillColor: rowFill, alignment: 'right', style: 'mainCell' },
          {
            text: formatPrice(parseFloat(mItem.cost) * parseFloat(mItem.cantitate)) || '',
            fillColor: rowFill,
            alignment: 'right',
            noWrap: true,
            style: 'mainCell'
          }
        ])
        : [];
      //add materiale length
      finalIndex += Object.keys(item.Material || {}).length;

      const utilajeRows = item.Utilaj
        ? Object.values(item.Utilaj).map((mItem, mindex) => [
          { text: `${index + 1}.${finalIndex + mindex + 1}`, fillColor: rowFill, alignment: 'left', style: 'mainCell' },
          { image: utilajeImage, width: 10, height: 10, alignment: 'center' },
          { text: '', fillColor: rowFill, style: 'mainCell' },
          { text: '', fillColor: rowFill, style: 'mainCell' },
          { text: mItem.cod || '', fillColor: rowFill, style: 'mainCell' },
          { text: mItem.clasa || '', fillColor: rowFill, style: 'mainCell' },
          { text: mItem.articol_fr || '', fillColor: rowFill, style: 'mainCell' },
          { text: mItem.descriere_fr || '', fillColor: rowFill, style: 'mainCell' },
          { text: mItem.unitate_masura || '', fillColor: rowFill, alignment: 'center', style: 'mainCell' },
          { text: formatPrice(mItem.cantitate) || '', fillColor: rowFill, alignment: 'right', style: 'mainCell' },
          { text: formatPrice(mItem.cost) || '', fillColor: rowFill, alignment: 'right', style: 'mainCell' },
          {
            text: formatPrice(parseFloat(mItem.cost) * parseFloat(mItem.cantitate)) || '',
            fillColor: rowFill,
            alignment: 'right',
            noWrap: true,
            style: 'mainCell'
          }
        ])
        : [];
      // add utilaje length
      finalIndex += Object.keys(item.Utilaj || {}).length;

      const transportRows = item.Transport
        ? Object.values(item.Transport).map((mItem, mindex) => [
          { text: `${index + 1}.${finalIndex + mindex + 1}`, fillColor: rowFill, alignment: 'left', style: 'mainCell' },
          { image: transportImage, width: 10, height: 10, alignment: 'center' },
          { text: '', fillColor: rowFill, style: 'mainCell' },
          { text: '', fillColor: rowFill, style: 'mainCell' },
          { text: mItem.cod || '', fillColor: rowFill, style: 'mainCell' },
          { text: mItem.clasa || '', fillColor: rowFill, style: 'mainCell' },
          { text: mItem.articol_fr || '', fillColor: rowFill, style: 'mainCell' },
          { text: mItem.descriere_fr || '', fillColor: rowFill, style: 'mainCell' },
          { text: mItem.unitate_masura || '', fillColor: rowFill, alignment: 'center', style: 'mainCell' },
          { text: formatPrice(mItem.cantitate) || '', fillColor: rowFill, alignment: 'right', style: 'mainCell' },
          { text: formatPrice(mItem.cost) || '', fillColor: rowFill, alignment: 'right', style: 'mainCell' },
          {
            text: formatPrice(parseFloat(mItem.cost) * parseFloat(mItem.cantitate)) || '',
            fillColor: rowFill,
            alignment: 'right',
            noWrap: true,
            style: 'mainCell'
          }
        ])
        : [];


      return [retetaRow, ...manoperaRows, ...materialeRows, ...utilajeRows, ...transportRows];
    })
  ];

  const extraTableBody = [
    [
      { text: 'Heures de travail\n(Heure)', style: 'extraHeader', fillColor: "#93C5FD" },
      { text: 'Fabrication\n(EUR)', style: 'extraHeader', fillColor: "#FCD34D" },
      { text: 'Matériels\n(EUR)', style: 'extraHeader', fillColor: "#6EE7B7" },
      { text: 'Transport\n(EUR)', style: 'extraHeader', fillColor: "#F9A8D4" },
      { text: 'Utilisé\n(EUR)', style: 'extraHeader', fillColor: "#D8B4FE" },
    ],
    [
      { text: formatPrice(totalManoperaOre), style: 'extraCell', },
      { text: formatPrice(totalManoperaPret), style: 'extraCell', },
      { text: formatPrice(totalMaterialePret), style: 'extraCell', },
      { text: formatPrice(totalTransportPret), style: 'extraCell', },
      { text: formatPrice(totalUtilajePret), style: 'extraCell', },
    ],
  ];


  let total = parseFloat(totalManoperaPret) + parseFloat(totalMaterialePret) + parseFloat(totalTransportPret) + parseFloat(totalUtilajePret);
  const extraTableBodySecond = [
    [
      { text: 'Dépenses directes\n(EUR)', style: 'extraHeader', fillColor: "#93C5FD" },
      { text: '\u002B', style: 'extraHeader', rowSpan: 2, fillColor: "#ffffff", border: [false, false, false, false], margin: [0, 8, 0, 0], fontSize: 20 },
      { text: `Récapitulatifs ${recapitulatii}%\n(EUR)`, style: 'extraHeader', fillColor: "#93C5FD" },
      { text: '\u003D', style: 'extraHeader', rowSpan: 2, fillColor: "#ffffff", border: [false, false, false, false], margin: [0, 8, 0, 0], fontSize: 20 },
      { text: 'La valeur\n(EUR)', style: 'extraHeader', fillColor: "#93C5FD" },
      { text: '\u002B', style: 'extraHeader', rowSpan: 2, fillColor: "#ffffff", border: [false, false, false, false], margin: [0, 8, 0, 0], fontSize: 20 },
      { text: `TVA ${TVA}%\n(EUR)`, style: 'extraHeader', fillColor: "#93C5FD" },
      { text: '\u003D', style: 'extraHeader', rowSpan: 2, fillColor: "#ffffff", border: [false, false, false, false], margin: [0, 8, 0, 0], fontSize: 20 },
      { text: 'Total\n(EUR)', style: 'extraHeader', fillColor: "#93C5FD" },
    ],
    [
      { text: formatPrice(total), style: 'extraCell', },
      {},
      { text: formatPrice((recapitulatii / 100 * total)), style: 'extraCell', },
      {},
      { text: formatPrice((total + recapitulatii / 100 * total)), style: 'extraCell', },
      {},
      { text: formatPrice((TVA / 100 * (total + recapitulatii / 100 * total))), style: 'extraCell', },
      {},
      { text: formatPrice(((total + recapitulatii / 100 * total) + TVA / 100 * (total + recapitulatii / 100 * total))), style: 'extraCell', },
    ],
  ];

  const docDefinition = {
    pageOrientation: 'landscape',
    pageSize: 'A4',
    content: [
      {
        table: {
          widths: ['*'],
          heights: [40],
          body: [[
            {
              columns: [
                {
                  image: logo,
                  width: 200,
                  margin: [5, 10, 10, 5]
                },
                {
                  stack: [
                    { text: '15 Rue de Boulins, 77700 Bailly-Romainvilliers, France', alignment: 'right', fontSize: 9 },
                    { text: 'Siret: 841 626 526 00021   |   N° TVA: FR77982227001', alignment: 'right', fontSize: 9 },
                    { text: 'e-mail: office@btbtrust.fr', alignment: 'right', fontSize: 9 }
                  ],
                  margin: [0, 5, 5, 5]
                }
              ]
            }
          ]]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 5]
      },

      { text: `Client: ${santiereDetalii.beneficiar}`, style: 'subtitle', alignment: 'left', margin: [0, 0, 0, 5] },
      { text: `Contact: ${santiereDetalii.email} / ${santiereDetalii.telefon} `, style: 'subtitle', alignment: 'left', margin: [0, 0, 0, 5] },
      { text: `Chantier: ${santierName}`, style: 'subtitle', alignment: 'left', margin: [0, 0, 0, 5] },
      { text: `Offre: ${ofertaName} `, style: 'subtitle', alignment: 'left', margin: [0, 0, 0, 5] },
      { text: `Travail: ${ofertaPartName} `, style: 'subtitle', alignment: 'left', margin: [0, 0, 0, 20] },
      { text: 'Résumé des recettes du chantier :', style: 'sectionTitle' },
      {
        table: {
          dontBreakRows: true,
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', 'auto', 75, 'auto', { minWidth: 120, width: '*' }, { minWidth: 120, width: '*' }, 'auto', 'auto', 'auto', 'auto'],
          body: tableBody
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => '#000000',
          vLineColor: () => '#000000',
          paddingLeft: () => 5,
          paddingRight: () => 5,
          paddingTop: () => 3,
          paddingBottom: () => 3
        }
      },
      {
        text: '\nRésumé général',
        style: 'sectionTitle',
        margin: [0, 20, 0, 10],
        pageBreak: 'before'
      },
      {
        table: {
          headerRows: 1,
          // dontBreakRows: true,
          keepWithHeaderRows: 1,
          widths: Array(5).fill('auto'),
          body: extraTableBody
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => '#333',
          vLineColor: () => '#333',
          paddingLeft: () => 12,
          paddingRight: () => 12,
          paddingTop: () => 4,
          paddingBottom: () => 4
        }
      },
      {
        table: {
          headerRows: 1,
          // dontBreakRows: true,
          keepWithHeaderRows: 1,
          widths: Array(9).fill('auto'),
          body: extraTableBodySecond
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => '#333',
          vLineColor: () => '#333',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 4,
          paddingBottom: () => 4
        },
        margin: [0, 20, 0, 0]
      },
      {
        text: "Details d'exécution:",
        style: 'sectionTitle',
        margin: [0, 20, 0, 10]
      },
      {
        text: santiereDetalii.detalii_executie,
        margin: [5, 10, 0, 10],
        fontSize: 10,
      },
      {
        columns: [
          { text: `Créé par: \n${santiereDetalii.creatDe}`, alignment: 'left', margin: [50, 0, 0, 0] },
          { text: `Approuvé par: \n${santiereDetalii.aprobatDe}`, alignment: 'right', margin: [0, 0, 50, 0] }
        ],
        margin: [0, 10, 0, 0]
      }
    ],
    footer: function (currentPage, pageCount) {
      return {
        table: {
          widths: ['auto', '*', 150],
          body: [
            [
              {
                image: logo,
                width: 60,
                margin: [10, 10, 0, 5]
              },
              {
                text: 'Document généré automatiquement - Formulaire de feuille de calcul',
                fontSize: 8,
                alignment: 'left',
                margin: [0, 7.5, 0, 5],
                color: '#000000'
              },
              {
                text: `Page ${currentPage} sur ${pageCount}`,
                fontSize: 8,
                alignment: 'right',
                margin: [0, 7.5, 10, 5]
              }
            ]
          ]
        },
        layout: {
          hLineWidth: function (i) {
            return i === 0 ? 1 : 0; // Top border only
          },
          vLineWidth: function () {
            return 0; // No vertical lines
          },
          hLineColor: function () {
            return '#000000';
          }
        },
        margin: [30, 10, 30, 0]
      };
    },
    styles: {
      sectionTitle: {
        fontSize: 12,
        bold: true,
        margin: [0, 0, 0, 10],
        alignment: 'left'
      },
      mainHeader: {
        bold: true,
        fillColor: '#c9c9c9',  // Gri deschis, ca în screenshot
        fontSize: 9,
        color: '#000',
        alignment: 'center'
      },
      mainCell: {
        fontSize: 8,
        color: '#000',
      },
      extraHeader: {
        fillColor: '#ccc',
        fontSize: 9,
        color: '#000',
        alignment: 'center',
        // margin: [12,2,12,2], 
      },
      extraCell: {
        fontSize: 8,
        color: '#333',
        bold: true,
        alignment: 'center',
        margin: [4, 1, 4, 1],
      }
    },
    defaultStyle: {
      font: 'Avenir'
    }
  };

  pdfMake.createPdf(docDefinition).download(`${santierName}_${ofertaName}_${ofertaPartName}_Rasfirat.pdf`);

}