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

 