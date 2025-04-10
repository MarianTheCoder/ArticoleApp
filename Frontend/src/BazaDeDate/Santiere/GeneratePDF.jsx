import React from 'react'
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import api from '../../api/axiosAPI';
import { folderImage, logo, userImage, materialeImage, utilajeImage, transportImage } from './base64Items';
// margin: [0, 7.5, 10, 5] left top right bottom
pdfMake.vfs = pdfFonts.vfs;



  const insertWordBreaks = (text) => {
    if (!text) return '';
    return text.replace(/(.{20})/g, '$1\u200B'); // Add zero-width space every 20 characters
  };

  const generateC4pdf = async () =>{

  }

  const generateC5pdf = async (id, recapitulatii, TVA) =>{
      let res;
      try {
        res = await api.get(`/Formulare/generareC5/${id}` , {
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
      console.log(res.data)
      const {
        totalManoperaOre,
        totalManoperaPret,
        totalMaterialePret,
        totalUtilajePret,
        totalTransportPret
      } = res.data;
  
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
        ...dataTable.flatMap((item, index) => {
          const rowFill = "#ffffff";
      
          // Row pentru reteta
          const retetaRow = [
            { text: `${index + 1}`, fillColor: rowFill, alignment: 'center', style: 'mainCell' },
            { image: folderImage, width: 10, height: 10, alignment: 'center' },
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
      
          // Sub-randuri pentru manopera
          const manoperaRows = item.Manopera
            ? Object.values(item.Manopera).map((mItem) => [
                { text: ``, fillColor: rowFill, alignment: 'center', style: 'mainCell', border: [false, false, false, false] },
                { image: userImage, width: 10, height: 10, alignment: 'center' },
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

            const materialeRows = item.Material
            ? Object.values(item.Material).map((mItem) => [
                { text: ``, fillColor: rowFill, alignment: 'center', style: 'mainCell', border: [false, false, false, false] },
                { image: materialeImage, width: 10, height: 10, alignment: 'center' },
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

            const utilajeRows = item.Utilaj
            ? Object.values(item.Utilaj).map((mItem) => [
                { text: ``, fillColor: rowFill, alignment: 'center', style: 'mainCell', border: [false, false, false, false] },
                { image: utilajeImage, width: 10, height: 10, alignment: 'center' },
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

            
            const transportRows = item.Transport
            ? Object.values(item.Transport).map((mItem) => [
                { text: ``, fillColor: rowFill, alignment: 'center', style: 'mainCell', border: [false, false, false, false] },
                { image: transportImage, width: 10, height: 10, alignment: 'center' },
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
      
      
          return [retetaRow, ...manoperaRows , ...materialeRows, ...utilajeRows, ...transportRows];
        })
      ];
      
      const extraTableBody = [
          [
              {text: 'Ore Manopera', style: 'extraHeader',fillColor: "#93C5FD"},
              {text: 'Manopera', style: 'extraHeader',    fillColor: "#FCD34D"},
              {text: 'Materiale', style: 'extraHeader',   fillColor: "#6EE7B7"},
              {text: 'Transport', style: 'extraHeader',   fillColor: "#F9A8D4"},
              {text: 'Utilaje', style: 'extraHeader',     fillColor: "#D8B4FE"},
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
            {text: 'Cheltuieli Directe', style: 'extraHeader',  fillColor: "#93C5FD"},
            {text: '\u002B', style: 'extraHeader', rowSpan: 2 , fillColor: "#ffffff" , border: [false, false, false, false], margin: [0, 8, 0, 0] , fontSize: 20 },
            {text: `Recapitulații ${recapitulatii}% `, style: 'extraHeader',   fillColor: "#93C5FD"},
            {text: '\u003D', style: 'extraHeader', rowSpan: 2  , fillColor: "#ffffff", border: [false, false, false, false], margin: [0, 8, 0, 0] , fontSize: 20},
            {text: 'Valoarea', style: 'extraHeader',     fillColor: "#93C5FD"},
            {text: '\u002B', style: 'extraHeader', rowSpan: 2 , fillColor: "#ffffff" , border: [false, false, false, false], margin: [0, 8, 0, 0] , fontSize: 20 },
            {text: `TVA ${TVA}%`, style: 'extraHeader', fillColor: "#93C5FD"},
            {text: '\u003D', style: 'extraHeader', rowSpan: 2  , fillColor: "#ffffff", border: [false, false, false, false], margin: [0, 8, 0, 0] , fontSize: 20},
            {text: 'Total', style: 'extraHeader',     fillColor: "#93C5FD"},
        ],
        [
            { text: total, style: 'extraCell' ,  },
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
              layout: {
                hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 1 : 0),
                vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 1 : 0),
                hLineColor: () => '#000000',
                vLineColor: () => '#000000'
              },
              margin: [0, 0, 0, 30]
            },
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
                    text: 'Document generat automat - Formular C8 ',
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

  const generateC6pdf = async (id , recapitulatii, TVA) => {
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
            {text: 'Ore Manopera', style: 'extraHeader',fillColor: "#93C5FD"},
            {text: 'Manopera', style: 'extraHeader',    fillColor: "#FCD34D"},
            {text: 'Materiale', style: 'extraHeader',   fillColor: "#6EE7B7"},
            {text: 'Transport', style: 'extraHeader',   fillColor: "#F9A8D4"},
            {text: 'Utilaje', style: 'extraHeader',     fillColor: "#D8B4FE"},
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
          {text: 'Cheltuieli Directe', style: 'extraHeader',  fillColor: "#93C5FD"},
          {text: '\u002B', style: 'extraHeader', rowSpan: 2 , fillColor: "#ffffff" , border: [false, false, false, false], margin: [0, 8, 0, 0] , fontSize: 20 },
          {text: `Recapitulații ${recapitulatii}% `, style: 'extraHeader',   fillColor: "#93C5FD"},
          {text: '\u003D', style: 'extraHeader', rowSpan: 2  , fillColor: "#ffffff", border: [false, false, false, false], margin: [0, 8, 0, 0] , fontSize: 20},
          {text: 'Valoarea', style: 'extraHeader',     fillColor: "#93C5FD"},
          {text: '\u002B', style: 'extraHeader', rowSpan: 2 , fillColor: "#ffffff" , border: [false, false, false, false], margin: [0, 8, 0, 0] , fontSize: 20 },
          {text: `TVA ${TVA}%`, style: 'extraHeader', fillColor: "#93C5FD"},
          {text: '\u003D', style: 'extraHeader', rowSpan: 2  , fillColor: "#ffffff", border: [false, false, false, false], margin: [0, 8, 0, 0] , fontSize: 20},
          {text: 'Total', style: 'extraHeader',     fillColor: "#93C5FD"},
      ],
      [
          { text: total, style: 'extraCell' ,  },
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
            layout: {
              hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 1 : 0),
              vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 1 : 0),
              hLineColor: () => '#000000',
              vLineColor: () => '#000000'
            },
            margin: [0, 0, 0, 30]
          },
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
                  text: 'Document generat automat - Formular C8 ',
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
  };











  const generateC8pdf = async (id) => {
    let res;
    try {
      res = await api.get(`/Formulare/generareC8/${id}`);
    } catch (error) {
      console.log(error);
      return;
    }
    let dataTable = res.data.data;
    let totalCost = res.data.total;
    console.log(res.data)
    const tableBody = [
      [
        { text: 'Nr.', style: 'mainHeader', margin: [0, 10, 0, 0] },
        { text: 'Denumire utilaj', style: 'mainHeader' , margin: [0, 10, 0, 0] },
        { text: 'Ore de funcționare', style: 'mainHeader', margin: [0, 5, 0, 0]},
        { text: 'Tarif unitar \n (fără TVA) \n - Lei/oră -', style: 'mainHeader' },
        { text: 'Valoare \n (fără TVA) \n - Lei -', style: 'mainHeader' },
      ],
      ...Object.values(dataTable).map((item, index) => {
        // const isEven = index % 2 === 0;
        const rowFill =  null;
  
        return [
          { text: `${index + 1}`, fillColor: rowFill, alignment: 'center', style: 'mainCell' },
          { text: item.name || '', fillColor: rowFill, style: 'mainCell' },
          { text: item.cantitate || '', fillColor: rowFill, style: 'mainCell' },
          { text: item.cost || '', fillColor: rowFill, style: 'mainCell' },
          {
            text: (parseFloat(item.cost) * parseFloat(item.cantitate)).toFixed(2),
            fillColor: rowFill,
            alignment: 'right',
            noWrap: true,
            style: 'mainCell',
            bold:true,
          }
        ];
      }),
      [
        { text: 'TOTAL Utilaje', colSpan: 2, fontSize:10, bold:true, fillColor: '#c6c6c6', border: [true, false, false, true]},
        {},
        { text: '', fillColor: '#c6c6c6', border: [false, false, false, true]},
        { text: '', fillColor: '#c6c6c6', border: [false, false, false, true]},
        { text: totalCost, fontSize:8, alignment:"right", bold:true, fillColor: '#c6c6c6' , margin: [0, 2, 0, 0]},
      ]
    ];
    const docDefinition = {
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
            layout: {
              hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 1 : 0),
              vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 1 : 0),
              hLineColor: () => '#000000',
              vLineColor: () => '#000000'
            },
            margin: [0, 0, 0, 30]
          },
          {
            columns: [
              {
                stack: [
                  { text: 'Formular C8', alignment: 'center', bold:true, fontSize: 12 },
                  { text: 'Lista cuprinzând consumurile de ore de funcționare a utilajelor de construcții', bold:true, alignment: 'center', fontSize: 12 },
                ],
                margin: [0, 5, 5, 15]
              }
            ]
          },
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', 'auto', 60,  60],
            body: tableBody
          },
          layout: {
            hLineWidth: function (i, node) {
                return 1;
            },
            vLineWidth: function (i, node) {
                  return 1; // Otherwise show normal vertical lines
            },
            hLineColor: () => '#000000',
            vLineColor: () => '#000000',
            paddingLeft: () => 5,
            paddingRight: () => 5,
            paddingTop: () => 3,
            paddingBottom: () => 3
          }
        },
      ],
      styles: {
        sectionTitle: {
          fontSize: 12,
          bold: true,
          margin: [0, 0, 0, 10],
          alignment: 'left'
        },
        mainHeader: {
            height:100,
          bold: true,
          fillColor: '#d9edf7',
          fontSize: 9,
          color: '#000',
          alignment: 'center',
        },
        mainCell: {
          fontSize: 8,
          color: '#000',
        },
        extraHeader: {
          bold: true,
          fillColor: '#ccc',
          fontSize: 8,
          color: '#000',
          alignment: 'center'
        },
        extraCell: {
          fontSize: 8,
          color: '#333',
          alignment: 'left'
        }
      },
      defaultStyle: {
        font: 'Roboto'
      },
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
                  text: 'Document generat automat - Formular C8 ',
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
      }
    };
  
    pdfMake.createPdf(docDefinition).download('Retete_Santier.pdf');
}


export const generatePDF = (id , selected, recapitulatii, TVA) => {
    switch(selected) {
        case 'C4':
          generateC4pdf(id);
          break;
        case 'C5':
          generateC5pdf(id, recapitulatii , TVA); // In this case, id would be an array of IDs
          break;
        case 'C6':
          generateC6pdf(id, recapitulatii , TVA); // Here id would represent the report type
          break;
        case 'C8':
          generateC8pdf(id); // Here id would represent the report type
          break;
        default:
          console.warn("Unknown PDF generation type:", selected);
      }
  };

 