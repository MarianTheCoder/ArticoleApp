import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { folderImage, logo, userImage, materialeImage, utilajeImage, transportImage } from '../../base64Items';
import api from '../../../../api/axiosAPI';
// margin: [0, 7.5, 10, 5] left top right bottom
pdfMake.vfs = pdfFonts.vfs;

const fmt = num =>
  Number(num)
    .toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });


export const FormularCompact = async (id ,recapitulatii, TVA) => {
  let res;
  try {
    res = await api.get(`/Formulare/generareC6/${id}` , {
      params: {
        recapitulatii: recapitulatii,
        TVA: TVA
      }
    });
  } catch (error) {
    console.log(error);
    return;
  }
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
  // console.log(res.data)
  const tableBody = [
    [
      { text: 'Nr.', style: 'mainHeader' },
      { text: 'Icon', style: 'mainHeader' },
      { text: 'Cod', style: 'mainHeader' },
      { text: 'Clasa', style: 'mainHeader' },
      { text: 'Articol', style: 'mainHeader' },
      { text: 'Unitate', style: 'mainHeader' },
      { text: 'Cantitate', style: 'mainHeader' },
      { text: 'Cost', style: 'mainHeader' },
      { text: 'Cost Total', style: 'mainHeader' }
    ],
    ...dataTable.map((item, index) => {
      const rowFill = "#ffffff";

      return [
        { text: `${index + 1}`, fillColor: rowFill, alignment: 'center', style: 'mainCell' },
        {
          image: folderImage,
          width: 10,
          height: 10,
          alignment: 'center',
        },
        { text: item.cod_reteta || '', fillColor: rowFill, style: 'mainCell' },
        { text: item.clasa_reteta || '', fillColor: rowFill, style: 'mainCell' },
        { text: item.articol || '', fillColor: rowFill, style: 'mainCell' },
        { text: item.unitate_masura || '', fillColor: rowFill, alignment: 'center', style: 'mainCell' },
        { text: item.cantitate || '', fillColor: rowFill, alignment: 'right', style: 'mainCell' },
        { text: item.cost || '', fillColor: rowFill, alignment: 'right', style: 'mainCell' },
        {
          text: (parseFloat(item.cost) * parseFloat(item.cantitate)).toFixed(2),
          fillColor: rowFill,
          alignment: 'right',
          noWrap: true,
          style: 'mainCell'
        }
      ];
    })
  ];

  const extraTableBody = [
      [
              {text: 'Ore manoperă\n(ore)', style: 'extraHeader', fillColor: "#93C5FD"},
              {text: 'Manoperă\n(RON)', style: 'extraHeader', fillColor: "#FCD34D"},
              {text: 'Materiale\n(RON)', style: 'extraHeader', fillColor: "#6EE7B7"},
              {text: 'Transport\n(RON)', style: 'extraHeader', fillColor: "#F9A8D4"},
              {text: 'Utilaje\n(RON)', style: 'extraHeader', fillColor: "#D8B4FE"},
      ],
      [
          { text: fmt(totalManoperaOre), style: 'extraCell' ,  },
          { text: fmt(totalManoperaPret), style: 'extraCell',   },
          { text: fmt(totalMaterialePret), style: 'extraCell',  },
          { text: fmt(totalTransportPret), style: 'extraCell',  },
          { text: fmt(totalUtilajePret), style: 'extraCell',   },
      ],
  ];


  let total = parseFloat(totalManoperaPret) + parseFloat(totalMaterialePret) + parseFloat(totalTransportPret) + parseFloat(totalUtilajePret);
  const extraTableBodySecond = [
    [
            {text: 'Cheltuieli directe\n(RON)', style: 'extraHeader', fillColor: "#93C5FD"},
            {text: '+', style: 'extraHeader', rowSpan: 2, fillColor: "#ffffff", border: [false, false, false, false], margin: [0, 8, 0, 0], fontSize: 20},
            {text: `Recapitulare ${recapitulatii}%\n(RON)`, style: 'extraHeader', fillColor: "#93C5FD"},
            {text: '=', style: 'extraHeader', rowSpan: 2, fillColor: "#ffffff", border: [false, false, false, false], margin: [0, 8, 0, 0], fontSize: 20},
            {text: 'Valoare\n(RON)', style: 'extraHeader', fillColor: "#93C5FD"},
            {text: '+', style: 'extraHeader', rowSpan: 2, fillColor: "#ffffff", border: [false, false, false, false], margin: [0, 8, 0, 0], fontSize: 20},
            {text: `TVA ${TVA}%\n(RON)`, style: 'extraHeader', fillColor: "#93C5FD"},
            {text: '=', style: 'extraHeader', rowSpan: 2, fillColor: "#ffffff", border: [false, false, false, false], margin: [0, 8, 0, 0], fontSize: 20},
            {text: 'Total\n(RON)', style: 'extraHeader', fillColor: "#93C5FD"},
    ],
    [
        { text: fmt(total.toFixed(2)), style: 'extraCell' ,  },
        {},
        { text: fmt((recapitulatii / 100 * total).toFixed(2)) , style: 'extraCell' ,  },
        {},
        { text: fmt((total + recapitulatii / 100 * total).toFixed(2)), style: 'extraCell',   },
        {},
        { text: fmt((TVA/100 * (total + recapitulatii / 100 * total)).toFixed(2)), style: 'extraCell',  },
        {},
        { text: fmt(((total + recapitulatii / 100 * total) + TVA/100 * (total + recapitulatii / 100 * total)).toFixed(2)) , style: 'extraCell',  },
    ],
];

  const docDefinition = {
     pageOrientation: 'landscape',
     pageSize: 'A4',
      pageMargins: [30, 25, 30, 45],
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
                    width: 150,
                    margin: [5, 5, 10, 5]
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
          margin: [0, 0, 0, 10]
        },
      { text: `Client: ${santiereDetalii.beneficiar}`, style: 'subtitle',alignment: 'left', margin: [0, 0, 0, 5] },
      { text: `Contact: ${santiereDetalii.email} / ${santiereDetalii.telefon} `, style: 'subtitle',alignment: 'left', margin: [0, 0, 0, 5] },
      { text: `Santier: ${santierName}`, style: 'subtitle',alignment: 'left', margin: [0, 0, 0, 5] },
      { text: `Oferta: ${ofertaName} `, style: 'subtitle',alignment: 'left', margin: [0, 0, 0, 5] },
      { text: `Lucrare: ${ofertaPartName} `, style: 'subtitle',alignment: 'left', margin: [0, 0, 0, 20] },
      { text: 'Rezumatul retetelor din  șantier', style: 'sectionTitle' },
      {
        table: {
          headerRows: 1,
          widths: ['auto','auto', 'auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto'],
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
        text: '\nRezumat General',
        style: 'sectionTitle',
        margin: [0, 20, 0, 10]
      },
      {
        table: {
          headerRows: 1,
          widths: Array(5).fill('auto'),
          body: extraTableBody
        },
        pageBreak: 'avoid',
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
          widths: Array(9).fill('auto'),
          body: extraTableBodySecond
        },
        pageBreak: 'avoid',
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
      { text: `Detalii Executie:`, alignment: 'left', margin: [0, 20, 0, 0],},
      {
        text: santiereDetalii.detalii_executie,
        margin: [5, 10, 0, 10],
        fontSize: 10,
      },
      {
        columns: [
          { text: `Creat de: \n${santiereDetalii.creatDe}`, alignment: 'left' , margin: [50,0,0,0] },
          { text: `Aprobat de: \n${santiereDetalii.aprobatDe}`, alignment: 'right' , margin: [0,0,50,0] }
        ],
        margin: [0, 10, 0, 0]
      }
    ],
    footer: function (currentPage, pageCount) {
      return {
        table: {
          widths: ['auto', '*', 'auto'],
          body: [
            [
              {
                image: logo, 
                width: 60,
                margin: [10, 10, 0, 5]
              },
              {
                text: 'Document generat automat - Formular  ',
                fontSize: 8,
                alignment: 'left',
                margin: [0, 7.5, 0, 5],
                color: '#000000'
              },
              {
                text: `Pagina ${currentPage} din ${pageCount}`,
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
        fillColor: '#d9edf7',
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
        margin: [4,1,4,1], 
      },
      subtitle: {
        fontSize: 10,
        italics: true,
        alignment: 'center'
      }
    },
    defaultStyle: {

    }
  };

  pdfMake.createPdf(docDefinition).download('Retete_Santier.pdf');
};