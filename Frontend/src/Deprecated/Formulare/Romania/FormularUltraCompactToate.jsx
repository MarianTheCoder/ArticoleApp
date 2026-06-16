import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import * as customVfsModule from '../../../../assets/fonts/vfs_fonts.js';
import { folderImage, logo, userImage, materialeImage, utilajeImage, transportImage } from '../../base64Items.jsx';
import api from '../../../../api/axiosAPI.jsx';
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

export const FormularUltraCompactToate = async (id, recapitulatii, TVA, reper1, reper2) => {
    let res;
    try {
        res = await api.get(`/Formulare/generareRasfiratByOfertaSUM/${id}`, {
            params: {
                recapitulatii: recapitulatii,
                TVA: TVA
            }
        });
    } catch (error) {
        console.log(error);
        return;
    }
    console.log(res.data);
    // console.log(detalii);
    let parts = res.data.parts;
    const {
        totalManoperaOre,
        totalManoperaPret,
        totalMaterialePret,
        totalUtilajePret,
        totalTransportPret
    } = res.data.totals;

    const {
        ofertaPartName,
        ofertaName,
        santierName,
        santiereDetalii
    } = res.data;

    const partsTables = parts.flatMap((part, idx) => {
        const tableBody = [
            [
                { text: 'Nr.', style: 'mainHeader' },
                { text: 'Poză', style: 'mainHeader' },
                { text: 'Cod', style: 'mainHeader' },
                { text: 'Clasă', style: 'mainHeader' },
                { text: 'Articol Client', style: 'mainHeader' },
                { text: 'Articol', style: 'mainHeader' },
                { text: 'Descriere', style: 'mainHeader' },
                { text: 'Unitate', style: 'mainHeader' },
                { text: 'Cantitate', style: 'mainHeader' },
                { text: 'Preț unitar \n (RON)', style: 'mainHeader' },
                { text: 'Preț total \n (RON)', style: 'mainHeader' }
            ],
            ...part.retete.map((item, index) => {
                return [
                    { text: `${index + 1}`, style: 'mainCell' },
                    { image: folderImage, width: 10, height: 10, alignment: 'center' },
                    { text: item.cod_reteta || '', style: 'mainCell' },
                    { text: item.clasa_reteta || '', style: 'mainCell' },
                    { text: item.articol_client || '', style: 'mainCell' },
                    { text: item.articol || '', style: 'mainCell' },
                    { text: item.descriere_reteta || item.descriere_reteta_fr || '', style: 'mainCell' },
                    { text: item.unitate_masura || '', style: 'mainCell', alignment: 'center' },
                    { text: formatPrice(item.cantitate) || '', style: 'mainCell', alignment: 'right', bold: true },
                    { text: formatPrice(item.cost) || '', style: 'mainCell', alignment: 'right', bold: true },
                    {
                        text: formatPrice((parseFloat(item.cost) * parseFloat(item.cantitate))) || '',
                        style: 'mainCell',
                        alignment: 'right',
                        bold: true
                    }
                ]
            })
        ];

        return [
            { text: `\nLucrare: ${part.partName}`, style: 'sectionTitle', margin: [0, 20, 0, 10] },
            {
                table: {
                    headerRows: 1,
                    dontBreakRows: true,
                    widths: ['auto', 'auto', 75, 'auto', "auto", { minWidth: 120, width: '*' }, { minWidth: 120, width: '*' }, 'auto', 'auto', 'auto', 'auto'],
                    body: tableBody,
                },
                layout: {
                    hLineWidth: () => 1,
                    vLineWidth: () => 1,
                    hLineColor: () => '#000',
                    vLineColor: () => '#000',
                    paddingLeft: () => 5,
                    paddingRight: () => 5,
                    paddingTop: () => 3,
                    paddingBottom: () => 3
                },
                pageBreak: 'after'
            }
        ];
    });
    const extraTableBody = [
        [
            { text: 'Ore de muncă\n(ORE)', style: 'extraHeader', fillColor: "#93C5FD" },
            { text: 'Manoperă\n(RON)', style: 'extraHeader', fillColor: "#FCD34D" },
            { text: 'Materiale\n(RON)', style: 'extraHeader', fillColor: "#6EE7B7" },
            { text: 'Transport\n(RON)', style: 'extraHeader', fillColor: "#F9A8D4" },
            { text: 'Utilaje\n(RON)', style: 'extraHeader', fillColor: "#D8B4FE" },
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
            { text: 'Cheltuieli directe\n(RON)', style: 'extraHeader', fillColor: "#93C5FD" },
            { text: '\u002B', style: 'extraHeader', rowSpan: 2, fillColor: "#ffffff", border: [false, false, false, false], margin: [0, 8, 0, 0], fontSize: 20 },
            { text: `Recapitulații ${recapitulatii}%\n(RON)`, style: 'extraHeader', fillColor: "#93C5FD" },
            { text: '\u003D', style: 'extraHeader', rowSpan: 2, fillColor: "#ffffff", border: [false, false, false, false], margin: [0, 8, 0, 0], fontSize: 20 },
            { text: 'Valoare\n(RON)', style: 'extraHeader', fillColor: "#93C5FD" },
            { text: '\u002B', style: 'extraHeader', rowSpan: 2, fillColor: "#ffffff", border: [false, false, false, false], margin: [0, 8, 0, 0], fontSize: 20 },
            { text: `TVA ${TVA}%\n(RON)`, style: 'extraHeader', fillColor: "#93C5FD" },
            { text: '\u003D', style: 'extraHeader', rowSpan: 2, fillColor: "#ffffff", border: [false, false, false, false], margin: [0, 8, 0, 0], fontSize: 20 },
            { text: 'Total\n(RON)', style: 'extraHeader', fillColor: "#93C5FD" },
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
            { text: `Ofertă: ${ofertaName} `, style: 'subtitle', alignment: 'left', margin: [0, 0, 0, 5] },
            { text: `Lucrare: Toate operațiunile `, style: 'subtitle', alignment: 'left', margin: [0, 0, 0, 20] },
            { text: 'Rezumatul general al șantierului:', style: 'sectionTitle' },
            ...partsTables,
            {
                text: '\nRezumat general',
                style: 'sectionTitle',
                margin: [0, 20, 0, 10],
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
                text: "Detalii de execuție:",
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
                    { text: `Creat de: \n${santiereDetalii.creatDe}`, alignment: 'left', margin: [50, 0, 0, 0] },
                    { text: `Aprobat de: \n${santiereDetalii.aprobatDe}`, alignment: 'right', margin: [0, 0, 50, 0] }
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
                                text: 'Document generat automat',
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

    pdfMake.createPdf(docDefinition).download(`${santierName}_${ofertaName}_Ultra_Compact.pdf`);

}