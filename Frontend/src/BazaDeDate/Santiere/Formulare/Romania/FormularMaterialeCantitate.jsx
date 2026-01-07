import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import * as customVfsModule from '../../../../assets/fonts/vfs_fonts.js';
import { folderImage, logo, userImage, materialeImage, utilajeImage, transportImage } from '../../base64Items.jsx';
import api from '../../../../api/axiosAPI.jsx';
import photoAPI from '../../../../api/photoAPI.jsx';
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

const toBase64 = async (url) => {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
};

const generateImagesMap = async (materials) => {
    const imageMap = {};
    for (const mat of materials) {
        try {
            if (!mat.photoUrl) continue;

            const fullImageUrl = `${photoAPI}/${mat.photoUrl}`;
            const base64 = await toBase64(fullImageUrl);

            if (!base64.startsWith('data:image/')) continue;

            imageMap[mat.cod] = base64;
        } catch (e) {
            console.warn(`Image load failed for ${mat.cod}`, e);
            // Nu adăugăm nimic
        }
    }
    return imageMap;
};
export const FormularMaterialeCantitate = async (id, recapitulatii, TVA, reper1, reper2) => {
    let res;
    try {
        res = await api.get(`/Formulare/generareMaterialeCantitate/${id}`, {
            params: {
                recapitulatii: recapitulatii,
                TVA: TVA
            }
        });
    } catch (error) {
        console.log(error);
        return;
    }
    console.log(res.data.data);
    // return;
    // console.log(santierDetails.data.santierDetails[0]);
    // console.log(detalii);
    let dataTable = (res.data.data ?? []).slice().sort((a, b) => {
        // push empty/undefined codes to the end
        if (!a?.cod && !b?.cod) return 0;
        if (!a?.cod) return 1;
        if (!b?.cod) return -1;

        // locale-aware, numeric-aware ascending sort
        return String(a.cod).localeCompare(String(b.cod), 'ro', { numeric: true, sensitivity: 'base' });
    });
    const {
        ofertaPartName,
        ofertaName,
        santierName,
        santiereDetalii
    } = res.data;

    const imageMap = await generateImagesMap(dataTable);

    const tableBody = [
        [
            { text: 'Nr.', style: 'mainHeader' },
            { text: 'Poză', style: 'mainHeader' },
            { text: "Furnizor", style: 'mainHeader' },
            { text: 'Cod', style: 'mainHeader' },
            { text: 'Clasă', style: 'mainHeader' },
            { text: 'Articol', style: 'mainHeader' },
            // { text: 'Description', style: 'mainHeader' },
            { text: 'Unitate', style: 'mainHeader' },
            { text: 'Cantitate', style: 'mainHeader' },
        ],
        ...dataTable.flatMap((item, index) => {
            const materialeRow = [
                { text: `${index + 1}`, fillColor: "#ffffff", alignment: 'left', style: 'mainCell' },
                imageMap[item.cod]
                    ? { image: imageMap[item.cod], width: 28, height: 28, alignment: 'center', fillColor: "#ffffff" }
                    : { text: '', fillColor: "#ffffff" },
                { text: item.furnizor || '', fillColor: "#ffffff", style: 'mainCell' },
                { text: item.cod || '', fillColor: "#ffffff", style: 'mainCell' },
                { text: item.clasa || '', fillColor: "#ffffff", style: 'mainCell' },
                { text: item.articol || '', fillColor: "#ffffff", style: 'mainCell' },
                // { text: item.descriere_fr || '', fillColor: "#ffffff", style: 'mainCell' },
                { text: formatPrice(item.unitate_masura) || '', fillColor: "#ffffff", alignment: 'center', style: 'mainCell' },
                { text: formatPrice(item.cantitate) || '', fillColor: "#ffffff", alignment: 'right', style: 'mainCell', bold: true },
            ];
            return [materialeRow]
        })
    ];



    const docDefinition = {
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
            { text: `Șantier: ${santierName}`, style: 'subtitle', alignment: 'left', margin: [0, 0, 0, 5] },
            { text: `Ofertă: ${ofertaName} `, style: 'subtitle', alignment: 'left', margin: [0, 0, 0, 5] },
            { text: `Lucrare: ${ofertaPartName} `, style: 'subtitle', alignment: 'left', margin: [0, 0, 0, 20] },
            { text: 'Rezumatul rețetelor șantierului:', style: 'sectionTitle' },
            {
                table: {
                    dontBreakRows: true,
                    headerRows: 1,
                    widths: ['auto', 'auto', 'auto', 73, 'auto', { minWidth: 120, width: '*' }, 'auto', 'auto'],
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
                text: '\nRezumat general:',
                style: 'sectionTitle',
                margin: [0, 20, 0, 10],
                pageBreak: 'before'
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
                    widths: ['auto', '*', 'auto'],
                    body: [
                        [
                            {
                                image: logo,
                                width: 60,
                                margin: [10, 10, 0, 5]
                            },
                            {
                                text: 'Document generat automat - Materiale',
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

    pdfMake.createPdf(docDefinition).download(`${santierName}_${ofertaName}_${ofertaPartName}_Materiale.pdf`);

}