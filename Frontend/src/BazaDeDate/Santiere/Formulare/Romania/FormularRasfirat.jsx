import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { folderImage, logo, userImage, materialeImage, utilajeImage, transportImage } from '../../base64Items';
import api from '../../../../api/axiosAPI';
// margin: [0, 7.5, 10, 5] left top right bottom
pdfMake.vfs = pdfFonts.vfs;



  const insertWordBreaks = (text) => {
    if (!text) return '';
    return text.replace(/(.{20})/g, '$1\u200B'); // Add zero-width space every 20 characters
  };

export const FormularRasfirat = async (id ,recapitulatii, TVA) => {
        let res;
        let santierDetails;
        try {
          res = await api.get(`/Formulare/generareC5/${id}` , {
            params: {
              recapitulatii: recapitulatii,
              TVA: TVA
            }
          });
          santierDetails = await api.get(`/Santiere/getSantiereDetails/${id}`);

        } catch (error) {
          console.log(error);
          return;
        }
        let detalii = santierDetails.data.santierDetails[0].detalii_executie;
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
    
        const tableBody = [
          [
           { text: 'Nr. crt.', style: 'mainHeader' },
      { text: 'Imagine', style: 'mainHeader' },
      { text: 'Detalii', style: 'mainHeader' },
      { text: 'Reper plan', style: 'mainHeader' },
      { text: 'Cod', style: 'mainHeader' },
      { text: 'Clasă', style: 'mainHeader' },
      { text: 'Articol', style: 'mainHeader' },
      { text: 'Unitate', style: 'mainHeader' },
      { text: 'Cantitate', style: 'mainHeader' },
      { text: 'Preț unitar \n (RON)', style: 'mainHeader' },
      { text: 'Preț total \n (RON)', style: 'mainHeader' }
          ],
          ...dataTable.flatMap((item, index) => {
            const rowFill = "#ffffff";
            let finalIndex = 0;
            // Row pentru reteta
            const retetaRow = [
              { text: `${index + 1}`, fillColor: rowFill, alignment: 'left', style: 'mainCell' },
              { image: folderImage, width: 10, height: 10, alignment: 'center' },
              { text: item.detalii_aditionale || '', fillColor: rowFill, style: 'mainCell' },
              { text: item.reper_plan || '', fillColor: rowFill, style: 'mainCell' },
              { text: item.cod_reteta || '', fillColor: rowFill, style: 'mainCell' },
              { text: item.clasa_reteta || '', fillColor: rowFill, style: 'mainCell' },
              { text: item.articol_fr || '', fillColor: rowFill, style: 'mainCell' },
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
        
            // Sub-randuri pentru manopera
            const manoperaRows = item.Manopera
              ? Object.values(item.Manopera).map((mItem, mindex) => [
                  {  text: `${index + 1}.${mindex+1}`, fillColor: rowFill, alignment: 'left', style: 'mainCell' },
                  { image: userImage, width: 10, height: 10, alignment: 'center' },
              { text: '', fillColor: rowFill, style: 'mainCell' },
              { text: '', fillColor: rowFill, style: 'mainCell' },                  
                  { text: mItem.cod || '', fillColor: rowFill, style: 'mainCell' },
                  { text: mItem.clasa || '', fillColor: rowFill, style: 'mainCell' },
                  { text: insertWordBreaks(mItem.articol_fr) || '', fillColor: rowFill, style: 'mainCell' },
                  { text: mItem.unitate_masura || '', fillColor: rowFill, alignment: 'center', style: 'mainCell' },
                  { text: mItem.cantitate || '', fillColor: rowFill, alignment: 'right', style: 'mainCell' },
                  { text: mItem.cost || '', fillColor: rowFill, alignment: 'right', style: 'mainCell' },
                  {
                    text: (parseFloat(mItem.cost) * parseFloat(mItem.cantitate)).toFixed(2),
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
              ? Object.values(item.Material).map((mItem , mindex) => [
                  { text: `${index + 1}.${finalIndex + mindex + 1}`, fillColor: rowFill, alignment: 'left', style: 'mainCell' },
                  { image: materialeImage, width: 10, height: 10, alignment: 'center' },
              { text: '', fillColor: rowFill, style: 'mainCell' },
              { text: '', fillColor: rowFill, style: 'mainCell' },                  
                  { text: mItem.cod || '', fillColor: rowFill, style: 'mainCell' },
                  { text: mItem.clasa || '', fillColor: rowFill, style: 'mainCell' },
                  { text: insertWordBreaks(mItem.articol) || '', fillColor: rowFill, style: 'mainCell' },
                  { text: mItem.unitate_masura || '', fillColor: rowFill, alignment: 'center', style: 'mainCell' },
                  { text: mItem.cantitate || '', fillColor: rowFill, alignment: 'right', style: 'mainCell' },
                  { text: mItem.cost || '', fillColor: rowFill, alignment: 'right', style: 'mainCell' },
                  {
                    text: (parseFloat(mItem.cost) * parseFloat(mItem.cantitate)).toFixed(2),
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
                  { text: insertWordBreaks(mItem.articol_fr) || '', fillColor: rowFill, style: 'mainCell' },
                  { text: mItem.unitate_masura || '', fillColor: rowFill, alignment: 'center', style: 'mainCell' },
                  { text: mItem.cantitate || '', fillColor: rowFill, alignment: 'right', style: 'mainCell' },
                  { text: mItem.cost || '', fillColor: rowFill, alignment: 'right', style: 'mainCell' },
                  {
                    text: (parseFloat(mItem.cost) * parseFloat(mItem.cantitate)).toFixed(2),
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
                  { text: insertWordBreaks(mItem.articol_fr) || '', fillColor: rowFill, style: 'mainCell' },
                  { text: mItem.unitate_masura || '', fillColor: rowFill, alignment: 'center', style: 'mainCell' },
                  { text: mItem.cantitate || '', fillColor: rowFill, alignment: 'right', style: 'mainCell' },
                  { text: mItem.cost || '', fillColor: rowFill, alignment: 'right', style: 'mainCell' },
                  {
                    text: (parseFloat(mItem.cost) * parseFloat(mItem.cantitate)).toFixed(2),
                    fillColor: rowFill,
                    alignment: 'right',
                    noWrap: true,
                    style: 'mainCell'
                }
                ])
              : [];
        
        
            return [retetaRow, ...manoperaRows , ...materialeRows, ...utilajeRows, ...transportRows];
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
                { text: totalManoperaOre, style: 'extraCell' ,  },
                { text: totalManoperaPret, style: 'extraCell',   },
                { text: totalMaterialePret, style: 'extraCell',  },
                { text: totalTransportPret, style: 'extraCell',  },
                { text: totalUtilajePret, style: 'extraCell',   },
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
              { text: total.toFixe, style: 'extraCell' ,  },
              {},
              { text: (recapitulatii / 100 * total).toFixed(2) , style: 'extraCell' ,  },
              {},
              { text: (total + recapitulatii / 100 * total).toFixed(2), style: 'extraCell',   },
              {},
              { text: (TVA/100 * (total + recapitulatii / 100 * total)).toFixed(2), style: 'extraCell',  },
              {},
              { text: ((total + recapitulatii / 100 * total) + TVA/100 * (total + recapitulatii / 100 * total)).toFixed(2) , style: 'extraCell',  },
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
                layout: {
                  hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 1 : 0),
                  vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 1 : 0),
                  hLineColor: () => '#000000',
                  vLineColor: () => '#000000'
                },
                margin: [0, 0, 0, 5]
              },
      
              { text: 'Client: ', margin: [0, 0, 0, 3]},
              { text: 'Contact: ', margin: [0, 0, 0, 3]},
              { text: "Cour: ", margin: [0, 0, 0, 20]},
         
            { text: 'Rezumatul rețetelor de pe șantier:', style: 'sectionTitle' },
            {
              table: {
                headerRows: 1,
                widths: ['auto','auto', 'auto','auto', 'auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto'],
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
              text: '\nRezumat general',
              style: 'sectionTitle',
              margin: [0, 20, 0, 10]
            },
            {
              table: {
                headerRows: 1,
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
              text: 'Detalii execuție:',
              style: 'sectionTitle',
              margin: [0, 20, 0, 10]
            },
            {
              text: detalii,
              margin: [0, 0, 0, 10]
            },
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
                      text: 'Document generat automat - Formular de rețete',
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
            }
          },
          defaultStyle: {
    
          }
        };
      
        pdfMake.createPdf(docDefinition).download('Retete_Santier.pdf');
      }