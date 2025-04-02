import React from 'react'
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import api from '../../api/axiosAPI';

pdfMake.vfs = pdfFonts.vfs;


  const insertWordBreaks = (text) => {
    if (!text) return '';
    return text.replace(/(.{20})/g, '$1\u200B'); // Add zero-width space every 20 characters
  };

  const generateC4pdf = async () =>{

  }

  const generateC5pdf = async () =>{

  }

  const generateC6pdf = async (id) => {
    let res;
    try {
      res = await api.get(`/Formulare/generareC6/${id}`);
    } catch (error) {
      console.log(error);
      return;
    }
  
    let dataTable = res.data.data;
  
    const tableBody = [
      [
        { text: 'Nr.', style: 'mainHeader' },
        { text: 'Cod', style: 'mainHeader' },
        { text: 'Clasa', style: 'mainHeader' },
        { text: 'Articol', style: 'mainHeader' },
        { text: 'Unitate', style: 'mainHeader' },
        { text: 'Cantitate', style: 'mainHeader' },
        { text: 'Cost', style: 'mainHeader' },
        { text: 'Cost Total', style: 'mainHeader' }
      ],
      ...dataTable.map((item, index) => {
        const isEven = index % 2 === 0;
        const rowFill = isEven ? '#f2f2f2' : null;
  
        return [
          { text: `${index + 1}`, fillColor: rowFill, alignment: 'center', style: 'mainCell' },
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
            {text: 'Ore Manopera', style: 'extraHeader' },
            {text: 'Manopera', style: 'extraHeader' },
            {text: 'Materiale', style: 'extraHeader' },
            {text: 'Transport', style: 'extraHeader' },
            {text: 'Utilaje', style: 'extraHeader' },
            {text: 'Header', style: 'extraHeader' },
            {text: 'Header', style: 'extraHeader' },
            {text: 'Header', style: 'extraHeader' },
            {text: 'Header', style: 'extraHeader' },
        ],
        [
            { text: '', style: 'extraCell' },
            { text: '', style: 'extraCell' },
            { text: '', style: 'extraCell' },
            { text: '', style: 'extraCell' },
            { text: '', style: 'extraCell' },
            { text: '', style: 'extraCell' },
            { text: '', style: 'extraCell' },
            { text: '', style: 'extraCell' },
            { text: '', style: 'extraCell' },
        ],
    ];
  
    const docDefinition = {
      content: [
        { text: 'Rețete din Șantier', style: 'sectionTitle' },
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto'],
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
            widths: Array(9).fill('*'),
            body: extraTableBody
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => '#333',
            vLineColor: () => '#333',
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 4,
            paddingBottom: () => 4
          }
        }
      ],
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
      }
    };
  
    pdfMake.createPdf(docDefinition).download('Retete_Santier.pdf');
  };

export const generatePDF = (id , selected) => {
    switch(selected) {
        case 'C4':
          generateC4pdf(id);
          break;
        case 'C5':
          generateC5pdf(id); // In this case, id would be an array of IDs
          break;
        case 'C6':
          generateC6pdf(id); // Here id would represent the report type
          break;
        default:
          console.warn("Unknown PDF generation type:", selected);
      }
  };

 