import React, { useContext, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom';
import SantiereAddOfertaMain from '../Ofertare/SantiereAddOfertaMain';
import api from '../../../api/axiosAPI';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faPlus } from '@fortawesome/free-solid-svg-icons';
import Oferte_PartsWrapper from './Oferte_PartsWrapper';


export default function SantiereRoutes() {
    
    const [loading, setLoading] = useState(true);
    const [oferte, setOferte] = useState([]);

    const {idUser, idSantier } = useParams();
    
    //what is selected?
    const [selectedButton,  setSelectedButton] = useState(-1);
    //see text if hovered
    const [hoveredIndex, setHoveredIndex] = useState(null);
    //dobule click to edit the text and autofocus
    const [editText, setEditText] = useState(null);
    //focus on input
    const inputRef = useRef(null);
    const [shouldFocus, setShouldFocus] = useState(false);
    //editableInput
    const [inputText, setInputText] = useState(""); 




    const fetchOferteForThisSantier = async () => { 
        try {
            const res = await api.get(`/Santiere/getOferteForThisSantier/${idSantier}`);
            setOferte(res.data.offers);
            setLoading(false);
        } catch (error) {
            console.log(error);            
        }
    }

    const changeName = async (id) => { 
        try {
            const res = await api.put(`/Santiere/changeNameForOferta/${id}` , {
                name: inputText,
              });
            fetchOferteForThisSantier();
            setEditText(null);
        } catch (error) {
            console.log(error);            
        }
    }


    //start edit on double click
    const startEditing = (id, name) => { 
        setInputText(name);
        setEditText(id);
        setShouldFocus(true);
    }

    //click to see which button i clicked, handle change of of
    const handleSelectedButton = (id) => { 
        if(selectedButton != id) {
            setSelectedButton(id);
            setEditText(null);
        }
        else{
            setSelectedButton(id);
        }
    }

    useEffect(() => {
        if (shouldFocus && inputRef.current) {
          inputRef.current.focus();
          setShouldFocus(false); // Reset the focus state after focusing
        }
      }, [shouldFocus]);  

    const addAutomaticOferta = async () => { 
        try {
            const res = await api.post(`/Santiere/addOfertaToTheSantier/${idSantier}`);
            fetchOferteForThisSantier();
        } catch (error) {
            console.log(error);            
        }
    }

    useEffect(() => {
        fetchOferteForThisSantier();
    }, []);


        useEffect(() => {
            document.addEventListener('click', handleClickOutside);
            return () => {
                document.removeEventListener('click', handleClickOutside);
            };
        }, []);
    
        const handleClickOutside = (event) => {
            if (!event.target.closest('.input_toEdit')) {
                setEditText(null)
            }
        };
    

  return (
    loading ? 
        <div className='w-full h-screen flex items-center justify-center'>
            <div className="loader"></div>
        </div> 
        :
    <div className='relative h-screen w-full  overflow-hidden flex items-end justify-center'>
        <div className=" w-[98%] h-[94%] relative flex justify-center rounded-lg ">
            <div className="absolute flex -top-9 left-20 -space-x-2 select-none">
                {oferte.map((item, index) => (
                    <div 
                        className={`relative transition-all duration-200 ${editText == item.id ? "w-64" : "w-32 delay-500"} select-none`} 
                        key={index}
                        onMouseEnter={() => setHoveredIndex(index)} 
                        onMouseLeave={() => setHoveredIndex(null)} 
                        onClick={() => handleSelectedButton(item.id)} 
                        onDoubleClick={() => startEditing(item.id, item.name)}
                    >
                        {editText != item.id ?
                            <p 
                                style={{
                                    zIndex: 70 - 2*index, // Dynamically set z-index
                                }}
                                className={`input_toEdit relative overflow-hidden  whitespace-nowrap  text-ellipsis hover:-translate-y-2 cursor-pointer   transition-all duration-[150ms]   text-white px-6 p-3 xxxl:px-4 rounded-tr-[4rem] rounded-tl-2xl  ${selectedButton == item.id && index != oferte.length-1 ? "bg-[#143458] -translate-y-2 shadow-[8px_8px_15px_rgba(0,0,0,1)] " : selectedButton == item.id && index == oferte.length-1 ? "bg-[#143458] -translate-y-2 shadow-[4px_4px_10px_rgba(0,0,0,1)]" :  "bg-[#265f5a] shadow-[4px_4px_10px_rgba(0,0,0,1)]"}`}>{item.name}</p>
                            :
                            <React.Fragment >
                                <input 
                                    style={{
                                        zIndex: 70 - 2*index, // Dynamically set z-index
                                    }}
                                    ref={inputRef}
                                    type="text" 
                                    value = {inputText}
                                    onChange = {(event) => setInputText(event.target.value)} 
                                    className={`input_toEdit w-full relative overflow-hidden  whitespace-nowrap  text-ellipsis hover:-translate-y-2 cursor-pointer   transition-all duration-[150ms]    text-white px-6 p-3 xxxl:px-4 rounded-tr-[4rem] rounded-tl-2xl  ${selectedButton == item.id ? "bg-[#143458] -translate-y-2 shadow-[8px_8px_15px_rgba(0,0,0,1)] " : "bg-[#265f5a] shadow-[4px_4px_10px_rgba(0,0,0,1)]"}`}
                                />
                                <div onClick={() => changeName(item.id)} className='z-[100] absolute px-3 -top-3 rounded-tr-3xl rounded-tl-xl rounded-b-lg   bg-green-500 hover:bg-green-600 cursor-pointer p-2 -right-7'><FontAwesomeIcon icon={faEdit}/></div>
                            </React.Fragment>
                        }
                        {hoveredIndex === index && item.name.length > 10 && (
                            <div className={`absolute z-[200] top-12 left-0   text-white p-2 rounded-md   bg-[#265f5a] shadow-[4px_4px_10px_rgba(0,0,0,1)] `}>
                                <div className={`absolute top-[-5px] left-12  transform  w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-b-[#265f5a]  border-transparent`}></div>
                                {item.name}
                            </div>
                        )}
                    </div>
                ))}
                { editText == null && <button onClick={() => addAutomaticOferta()} className={` relative  hover:bg-green-600  z-40 text-white px-4 p-2 rounded-tr-3xl rounded-tl-xl bg-green-500 shadow-[4px_4px_10px_rgba(0,0,0,1)] `}><FontAwesomeIcon icon={faPlus}/></button>}            </div>
            <div className=" containerNoGlassBlacker relative z-[70] overflow-hidden  w-full h-full  flex  flex-col items-center rounded-lg ">
                {
                selectedButton != -1 ? 
                    <Oferte_PartsWrapper ofertaId = {selectedButton}   key={`${idUser}-${idSantier}-${selectedButton}`} />
                    :
                    ""
                }
            </div>


        </div>
    </div>

  )
}
