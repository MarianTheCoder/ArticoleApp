import React, { useState, useEffect } from 'react';
import api from '../../api/axiosAPI';
import photoAPI from '../../api/photoAPI';

export default function Material() {
    const [products, setProducts] = useState([]);
    const [furnizor, setFurnizor] = useState('');
    const [clasaMaterile, setClasaMaterile] = useState('');
    const [codProdus, setCodProdus] = useState('');
    const [denumireProdus, setDenumireProdus] = useState('');
    const [descriereProdus, setDescriereProdus] = useState('');
    const [poza, setPoza] = useState(null);
    const [unitateMasura, setUnitateMasura] = useState('');
    const [costUnitar, setCostUnitar] = useState('');
    const [costPreferential, setCostPreferential] = useState('');
    const [pretVanzare, setPretVanzare] = useState('');
    const [message, setMessage] = useState('');

    // Funcție pentru a încărca datele din baza de date
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await api.get('/Materiale/api/materiale');
            setProducts(response.data);
        } catch (error) {
            console.error('Eroare la obținerea datelor:', error);
            setMessage('Eroare la obținerea datelor');
        }
    };

    // Funcție pentru a adăuga un nou produs
    const addProduct = async () => {
        try {
            const formData = new FormData();
            formData.append('furnizor', furnizor);
            formData.append('clasa_material', clasaMaterile);
            formData.append('cod_produs', codProdus);
            formData.append('denumire_produs', denumireProdus);
            formData.append('descriere_produs', descriereProdus);
            formData.append('poza', poza);
            formData.append('unitate_masura', unitateMasura);
            formData.append('cost_unitar', costUnitar);
            formData.append('cost_preferential', costPreferential);
            formData.append('pret_vanzare', pretVanzare);

            const response = await api.post('/Materiale/api/Materiale', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setMessage('Produs adăugat cu succes!');
            fetchProducts(); // Reîncarcă datele
        } catch (error) {
            console.error('Eroare la adăugarea produsului:', error);
            setMessage('Eroare la adăugarea produsului');
        }
    };

    return (
 
<div className='w-full text-xs ' style={{ backgroundColor: '#000043', color: 'white', padding: '20px'  }}>
    <h1 className='text-center text' >Gestiune Materiale</h1>

    {/* Formular pentru adăugarea unui nou produs */}
    <div className='grid w-full gap-2 grid-cols-[auto_auto_auto_auto_1fr_auto_auto_auto_auto_auto_auto] min-h-20 max-h-32'>
        {/* Furnizor */}
        <div className='flex flex-col items-start'>
            <p className='mb-1'>Furnizor</p>
            <input
                className='text-black w-full p-2'
                type="text"
                placeholder="Furnizor"
                value={furnizor}
                onChange={(e) => setFurnizor(e.target.value)}
            />
        </div>

        {/* Clasa Materile */}
        <div className='flex flex-col items-start'>
            <p className='mb-1'>Clasa Materile</p>
            <input
                className='text-black w-full p-2'
                type="text"
                placeholder="Clasa Materile"
                value={clasaMaterile}
                onChange={(e) => setClasaMaterile(e.target.value)}
            />
        </div>

        {/* Cod Produs */}
        <div className='flex flex-col items-start'>
            <p className='mb-1'>Cod Produs</p>
            <input
                className='text-black w-full p-2'
                type="number"
                placeholder="Cod Produs"
                value={codProdus}
                onChange={(e) => setCodProdus(e.target.value)}
            />
        </div>

        {/* Denumire Produs */}
        <div className='flex flex-col items-start'>
            <p className='mb-1'>Denumire Produs</p>
            <input
                className='text-black w-full p-2'
                type="text"
                placeholder="Denumire Produs"
                value={denumireProdus}
                onChange={(e) => setDenumireProdus(e.target.value)}
            />
        </div>

        {/* Descriere Produs */}
        <div className='flex flex-col items-start'>
            <p className='mb-1'>Descriere Produs</p>
            <textarea
                className='text-black w-full p-2 max-h-8 min-h-8'
                placeholder="Descriere Produs"
                value={descriereProdus}
                onChange={(e) => setDescriereProdus(e.target.value)}
            />
        </div>

        {/* Poza */}
        <div className='flex flex-col items-start'>
            <p className='mb-1'>Poza</p>
            <input
                className='text-white max-w-32 h-10'
                type="file"
                onChange={(e) => setPoza(e.target.files[0])}
            />
        </div>

        {/* Unitate de Masura */}
        <div className='flex flex-col items-start'>
            <p className='mb-1'>Unitate de Masura</p>
            <input
                className='text-black max-w-24 p-2'
                type="text"
                placeholder="Unitate de Masura"
                value={unitateMasura}
                onChange={(e) => setUnitateMasura(e.target.value)}
            />
        </div>

        {/* Cost Unitar */}
        <div className='flex flex-col items-start'>
            <p className='mb-1'>Cost Unitar</p>
            <input
                className='text-black max-w-24 p-2'
                type="number"
                placeholder="Cost Unitar"
                value={costUnitar}
                onChange={(e) => setCostUnitar(e.target.value)}
            />
        </div>

        {/* Cost Preferential */}
        <div className='flex flex-col items-start'>
            <p className='mb-1'>Cost Preferential</p>
            <input
                className='text-black max-w-24 p-2'
                type="number"
                placeholder="Cost Preferential"
                value={costPreferential}
                onChange={(e) => setCostPreferential(e.target.value)}
            />
        </div>

        {/* Pret Vanzare */}
        <div className='flex flex-col items-start'>
            <p className='mb-1'>Pret Vanzare</p>
            <input
                className='text-black max-w-24 p-2'
                type="number"
                placeholder="Pret Vanzare"
                value={pretVanzare}
                onChange={(e) => setPretVanzare(e.target.value)}
            />
              {/* Buton Adaugă Produs */}
         
        </div>
        <button className="mb-1 px-3 py-1.5 bg-gradient-to-r from-green-400 to-teal-500 text-white font-semibold rounded-full shadow-md transform transition-transform duration-200 hover:scale-105 focus:outline-none max-h-12 max-w-24  justify-center" 
    onClick={addProduct}
>
    Adaugă Produs
</button>



    </div>



            {/* Afișează mesajul */}
            {message && <p>{message}</p>}

            {/* Tabel pentru afișarea produselor */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                <thead>
                    <tr>
                        <th>Furnizor</th>
                        <th>Clasa Materile</th>
                        <th>Cod Produs</th>
                        <th>Denumire Produs</th>
                        <th>Descriere Produs</th>
                        <th>Poza</th>
                        <th>Unitate de Masura</th>
                        <th>Cost Unitar</th>
                        <th>Cost Preferential</th>
                        <th>Pret Vanzare</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((product) => (
                        <tr key={product.id}>
                            <td>{product.furnizor}</td>
                            <td>{product.clasa_materile}</td>
                            <td>{product.cod_produs}</td>
                            <td>{product.denumire_produs}</td>
                            <td>{product.descriere_produs}</td>
                            <td>
                                {product.photoUrl && (
                                    <img
                                        src={`${photoAPI}/${product.photoUrl}`}
                                        alt="Produs"
                                        style={{ width: '50px', height: '50px' }}
                                    />
                                )}
                            </td>
                            <td>{product.unitate_masura}</td>
                            <td>{product.cost_unitar}</td>
                            <td>{product.cost_preferential}</td>
                            <td>{product.pret_vanzare}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}