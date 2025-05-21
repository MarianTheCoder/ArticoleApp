import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { logo } from '../../base64Items';
import api from '../../../../api/axiosAPI';

pdfMake.vfs = pdfFonts.vfs;

export const FormularDevizGeneral = async (idOfertaPart, recapitulatii, TVA) => {
    let res;
        try {
          res = await api.get(`/Formulare/generareC5/${idOfertaPart}` , {
            params: {
              recapitulatii: recapitulatii,
              TVA: TVA
            }
          });
        } catch (error) {
          console.log(error);
          return;
        }
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

  //total prices
  let total = parseFloat(totalManoperaPret) + parseFloat(totalMaterialePret) + parseFloat(totalTransportPret) + parseFloat(totalUtilajePret);
  let totalWithRecapitulatii = total + (recapitulatii / 100 * total);
  let totalWithTVA = totalWithRecapitulatii + (TVA / 100 * totalWithRecapitulatii);
  const capitole = [
    ['CAPITOL 1', 'Cheltuieli pentru obținerea și amenajarea terenului'],
    ['1.1', 'Obținerea terenului'],
    ['1.2', 'Amenajarea terenului'],
    ['1.3', 'Amenajări pentru protecția mediului și aducerea terenului la starea inițială'],
    ['1.4', 'Cheltuieli pentru relocarea/protecția utilităților'],
    ['TOTAL CAPITOL 1', ''],

    ['CAPITOL 2', 'Cheltuieli pentru asigurarea utilităților necesare obiectivului de investiții'],
    ['2.1', 'Cheltuieli pentru asigurarea utilităților necesare obiectivului'],
    ['TOTAL CAPITOL 2', ''],

    ['CAPITOL 3', 'Cheltuieli pentru proiectare și asistență tehnică'],
    ['3.1', 'Studii'],
    ['3.1.1', 'Studii de teren'],
    ['3.1.2', 'Raport privind impactul asupra mediului'],
    ['3.1.3', 'Alte studii specifice'],
    ['3.2', 'Documentații-suport pentru obținerea de avize, acorduri și autorizații'],
    ['3.3', 'Expertizare tehnică'],
    ['3.4', 'Certificarea performanței energetice și auditul energetic al clădirilor, auditul de siguranță rutieră'],
    ['3.5', 'Proiectare'],
    ['3.5.1', 'Tema de proiectare'],
    ['3.5.2', 'Studiu de prefezabilitate'],
    ['3.5.3', 'Studiu de fezabilitate/Documentație de avizare a lucrărilor de intervenții și deviz general'],
    ['3.5.4', 'Documentațiile tehnice necesare în vederea obținerii avizelor/acordurilor/autorizațiilor'],
    ['3.5.5', 'Verificarea tehnică de calitate a proiectului tehnic și a detaliilor de execuție'],
    ['3.5.6', 'Proiect tehnic și detalii de execuție'],
    ['3.6', 'Organizarea procedurilor de achiziție'],
    ['3.7', 'Consultanță'],
    ['3.7.1', 'Managementul de proiect pentru obiectivul de investiții'],
    ['3.7.2', 'Audit financiar'],
    ['3.8', 'Asistență tehnică'],
    ['3.8.1.1', 'Asistență tehnică în execuție'],
    ['3.8.1.2', 'Participare proiectant la faze de control ISC'],
    ['3.8.2', 'Dirigenție de șantier'],
    ['3.8.3', 'Coordonator în materie de securitate și sănătate'],
    ['TOTAL CAPITOL 3', ''],

    ['CAPITOL 4', 'Cheltuieli pentru investiția de bază'],
    ['4.1', 'Construcții și instalații'],
    ['4.2', 'Montaj utilaje, echipamente tehnologice și funcționale'],
    ['4.3', 'Utilaje, echipamente care necesită montaj și echipamente de transport'],
    ['4.4', 'Utilaje, echipamente care nu necesită montaj'],
    ['4.5', 'Dotări'],
    ['4.6', 'Active necorporale'],
    ['TOTAL CAPITOL 4', ''],

    ['CAPITOL 5', 'Alte cheltuieli'],
    ['5.1', 'Organizare de șantier'],
    ['5.1.1', 'Lucrări de construcții și instalații pentru organizare'],
    ['5.1.2', 'Cheltuieli conexe organizării'],
    ['5.2', 'Comisioane, cote, taxe, costuri credite'],
    ['5.2.1', 'Comisioane și dobânzi aferente creditului'],
    ['5.2.2', 'Cota ISC pentru controlul calității lucrărilor'],
    ['5.2.3', 'Cota ISC pentru urbanism și autorizare'],
    ['5.2.4', 'Cota Casa Socială a Constructorilor - CSC'],
    ['5.2.5', 'Taxe pentru acorduri, avize, autorizații'],
    ['5.3', 'Cheltuieli diverse și neprevăzute'],
    ['5.4', 'Informare și publicitate'],
    ['TOTAL CAPITOL 5', ''],

    ['CAPITOL 6', 'Alte cheltuieli specifice'],
    ['6.1', 'Pregătirea personalului de exploatare'],
    ['6.2', 'Probe tehnologice și teste'],
    ['TOTAL CAPITOL 6', ''],

    ['CAPITOL 7', 'Rezerve și ajustări'],
    ['7.1', 'Marja de buget 25% (1.2+1.3+1.4+2+3.1+3.2+3.3+3.5+3.7+3.8+4+5.1.1)'],
    ['7.2', 'Rezervă de implementare pentru ajustarea de preț'],
    ['TOTAL CAPITOL 7', ''],

    ['TOTAL GENERAL', ''],
    ['', 'din care C + M (1.2 + 1.3 + 1.4 + 2 + 4.1 + 4.2 + 5.1.1)']
  ];

  const rows = [
    [
      { text: 'Nr. crt.', style: 'mainHeader' },
      { text: 'Denumirea capitolelor și subcapitolelor de cheltuieli', style: 'mainHeader' },
      { text: 'Valoare (fără TVA) (RON)', style: 'mainHeader' },
      { text: `TVA ${TVA}% (RON)`, style: 'mainHeader' },
      { text: 'Valoare cu TVA (RON)', style: 'mainHeader' }
    ],
    ...capitole.map((item, index) => {
      // console.log(item);
      const isCapitol = item[0].startsWith('CAPITOL');

      const isTotalCapitol4 = item[0].startsWith('TOTAL CAPITOL 4');
      const isConstructii = item[0].startsWith('4.1');

      const isTotal = item[0].startsWith('TOTAL') && item[0] !== 'TOTAL GENERAL';
      const isTotalGeneral = item[0] === 'TOTAL GENERAL';
      const isCMNote = item[0] === '';

      if (isCapitol) {
        return [
          { text: `${item[0]} - ${item[1]}`, style: 'capitolRow', colSpan: 5, alignment: 'left' }, {}, {}, {}, {}
        ];
      }

    if (isTotalGeneral) {
      return [
          { text: item[0], style: 'mainCell',colSpan: 2, alignment: 'left', fillColor: '#75da7e',bold: true }, // "TOTAL GENERAL"
          { },
          { text: totalWithRecapitulatii.toFixed(2) , style: 'mainCell', fillColor: '#75da7e' },
          { text: (TVA/100*totalWithRecapitulatii).toFixed(2) , style: 'mainCell', fillColor: '#75da7e' },
          { text: totalWithTVA.toFixed(2) , style: 'mainCell', fillColor: '#75da7e' }
        ];
      }

  if (isCMNote) {
   return [
    { text: item[1], style: 'mainCell',colSpan: 2, alignment: 'left', fillColor: '#ffffff' },
    { },
    { text: '0,00', style: 'mainCell', fillColor: '#ffffff' },
    { text: '0,00', style: 'mainCell', fillColor: '#ffffff' },
    { text: '0,00', style: 'mainCell', fillColor: '#ffffff' }
  ];
  }


  if(isConstructii) {
      return [
        { text: item[0], style: 'mainCell', alignment: 'left'},
        { text: item[1] || '', style: 'mainCell', alignment: 'left' },
        { text: totalWithRecapitulatii.toFixed(2) , style: 'mainCell' },
        { text: (TVA/100*totalWithRecapitulatii).toFixed(2), style: 'mainCell' },
        { text: totalWithTVA.toFixed(2), style: 'mainCell' }
      ];
    }
  if (isTotalCapitol4) {
    return [
      { text: item[0], style: 'mainCell',colSpan: 2, alignment: 'left', fillColor: '#b0f2b6', }, // adică "TOTAL CAPITOL 1"
      { },
      { text: totalWithRecapitulatii.toFixed(2) , style: 'mainCell', fillColor: '#b0f2b6' },
      { text: (TVA/100*totalWithRecapitulatii).toFixed(2) , style: 'mainCell', fillColor: '#b0f2b6' },
      { text: totalWithTVA.toFixed(2) , style: 'mainCell', fillColor: '#b0f2b6' }
    ];
  }

  if (isTotal) {
    return [
      { text: item[0], style: 'mainCell',colSpan: 2, alignment: 'left', fillColor: '#b0f2b6', }, // adică "TOTAL CAPITOL 1"
      { },
      { text: '0,00', style: 'mainCell', fillColor: '#b0f2b6' },
      { text: '0,00', style: 'mainCell', fillColor: '#b0f2b6' },
      { text: '0,00', style: 'mainCell', fillColor: '#b0f2b6' }
    ];
  }
      return [
        { text: item[0], style: 'mainCell', alignment: 'left'},
        { text: item[1] || '', style: 'mainCell', alignment: 'left' },
        { text: '0,00', style: 'mainCell' },
        { text: '0,00', style: 'mainCell' },
        { text: '0,00', style: 'mainCell' }
      ];
    })
  ];

  const docDefinition = {
    pageMargins: [30, 35, 30, 55],  // <-- raise bottom margin to 80pt
    content: [
      {
        table: {
          widths: ['*'],
          body: [[
            {
              columns: [
                {
                  image: logo,
                  width: 150,
                  margin: [5, 10, 10, 5]
                },
                {
                  stack: [
                    { text: '15 Rue de Boulins, 77700 Bailly-Romainvilliers, France', alignment: 'right', fontSize: 10 },
                    { text: 'Siret: 841 626 526 00021   |   N° TVA: FR77982227001', alignment: 'right', fontSize: 10 },
                    { text: 'e-mail: office@btbtrust.fr', alignment: 'right', fontSize: 10 }
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
      { text: 'Deviz General', style: 'title', margin: [0, 0, 0, 4] },
      { text: 'conform HG 907/2016', style: 'subtitle', margin: [0, 0, 0, 10] },
      { text: `Client: ${santiereDetalii.beneficiar}`, style: 'subtitle',alignment: 'left', margin: [0, 0, 0, 5] },
      { text: `Contact: ${santiereDetalii.email} / ${santiereDetalii.telefon} `, style: 'subtitle',alignment: 'left', margin: [0, 0, 0, 5] },
      { text: `Santier: ${santierName}`, style: 'subtitle',alignment: 'left', margin: [0, 0, 0, 5] },
      { text: `Oferta: ${ofertaName} `, style: 'subtitle',alignment: 'left', margin: [0, 0, 0, 5] },
      { text: `Lucrare: ${ofertaPartName} `, style: 'subtitle',alignment: 'left', margin: [0, 0, 0, 5] },
      { text: 'Anexa nr. 7', style: 'subtitle', alignment: 'right', fontSize: 10, margin: [0, 0, 0, 2] },
      {
        table: {
          widths: ['auto', '*', 'auto', 'auto', 'auto'],
          headerRows: 1,
          body: rows
        },
        layout: {
          hLineWidth: () => 0.7,
          vLineWidth: () => 0.7,
          hLineColor: () => '#000',
          vLineColor: () => '#000'
        },
        margin: [0, 0, 0, 0]
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
                margin: [10, 10, 0, 15]
              },
              {
                text: 'Document generat automat - Formular Deviz General ',
                fontSize: 8,
                alignment: 'left',
                margin: [0, 7.5, 0, 15],
                color: '#000000'
              },
              {
                text: `Pagina ${currentPage} din ${pageCount}`,
                fontSize: 8,
                alignment: 'right',
                margin: [0, 7.5, 10, 15]
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
        margin: [30, 10, 30, 30]
      };
    },
    styles: {
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
        alignment: 'center'
      },
      capitolRow: {
        fontSize: 9,
        bold: true,
        fillColor: '#eeeeee',
        color: '#000',
        alignment: 'left',
        margin: [4, 2, 0, 2]
      },
      totalRow: {
        fontSize: 9,
        bold: true,
        fillColor: '#d1fae5',
        alignment: 'left'
      },
      title: {
        fontSize: 16,
        bold: true,
        alignment: 'center'
      },
      subtitle: {
        fontSize: 10,
        italics: true,
        alignment: 'center'
      }
    },
    defaultStyle: {}
  };

  pdfMake.createPdf(docDefinition).download(`Deviz General - ${santierName} - ${ofertaName} - ${ofertaPartName}.pdf`);
};

export default FormularDevizGeneral