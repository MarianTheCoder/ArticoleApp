import { useContext, useEffect, useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowsSpin, faEye, faDatabase, faFilePen, faHelmetSafety, faHouse, faL, faNewspaper, faPeopleGroup, faPhone, faRightFromBracket, faUser, faUserPlus, faChevronRight, faFile, faH, faServer, faMinimize, faMinus, faScrewdriverWrench, faPerson, faTruck, faVanShuttle, faCar, faUserTie, faUsersGear, faGears, faRightToBracket, faFileShield, faUserTag, faPlus, faCancel, faMapLocationDot } from "@fortawesome/free-solid-svg-icons"; 
import photo from '../assets/no-user-image-square.jpg';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/TokenContext';
import Logo from '../assets/logo.svg';
import {useLocation} from 'react-router-dom';
import photoAPI from '../api/photoAPI';
import api from '../api/axiosAPI';

function Navbar() {

    const [selectedBeneficiari, setSelectedBeneficiari] = useState([]);
    const [addSantier, setAddSantier] = useState(false);
    const [santierName, setSantierName] = useState("");

    const [bazaDeDateOpen, setBazaDeDateOpen] = useState(false);
    const [dateOpen, setDateOpen] = useState(false);
    const [prezOpen, setPrezOpen] = useState(false);
    const [usersOpen, setUsersOpen] = useState(false);
    const [santiereOpen, setSantiereOpen] = useState(false);

    let navigate = useNavigate();
    const {user, logout, getUsersForSantiere, beneficiari, santiere, connectedSantiereToUser, setConnectedSantiereToUser} = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const photoStorage = localStorage.getItem("photoUser");


    useEffect(() => {
        getUsersForSantiere();
        setLoading(false);
    }, [])

    const handleBeneficiarClick = (beneficiarId) => {
        setSelectedBeneficiari((prevSelected) => {
            if (prevSelected.includes(beneficiarId)) {
                // If the beneficiar is already selected, remove it
                return prevSelected.filter((id) => id !== beneficiarId);
            } else {
                // If the beneficiar is not selected, add it
                return [...prevSelected, beneficiarId];
            }
        });
    };

    const addSantierToUser = async () => {
        if(santierName.trim() === ""){
            alert("Numele santierului nu poate fi gol");
        }
        try {
            const response = await api.post(`/users/addSantier`, {userId: addSantier, name: santierName});
            // console.log(response);
            setAddSantier(false);
            getUsersForSantiere();
        } catch (err) {
            console.error('Login failed:', err.response?.data?.message || err.message);
            return err; // Re-throw error for frontend handling
        }
    }

    useEffect(() => {
        if (Array.isArray(beneficiari) && beneficiari.length > 0) {
          const usersWithSantiere = beneficiari.map(user => {
            // Find all santiere for the current user by matching user.id with santiere.user_id
            const userSantiere = santiere.filter(santier => santier.user_id === user.id);
            
            // Add santiere array to each user
            return { ...user, santiere: userSantiere };
          });
        //   console.log(usersWithSantiere)
          setConnectedSantiereToUser(usersWithSantiere); // Save the matched data
        }
      }, [beneficiari, santiere]);
    

  return (
    <>
   
      {!loading && <div  className={` h-full overflow-hidden  bg-white max-w-72 w-full active`}>
        <ul className='h-full flex flex-col'>
            <li className=' py-4' style={{"--bg":"#333"}}>
                <a className=' cursor-default'>
                <div className="flex items-center">
                    <img src={Logo} alt="Website Logo" className={`w-full `} />
                </div>
                </a>
            </li>
            {/*main ul */}
        <ul className=' flex relative justify-between overflow-hidden h-full select-none flex-col'>
            {/* div for top buttons */}
            {user.role == "ofertant" ? 
                <>
                <div className=' flex flex-col gap-1 overflow-auto pr-1   text-black'>
                    {/* div for main database */}
                    <div className="text-2xl  hover:bg-gray-200 cursor-pointer py-1" onClick={() => setBazaDeDateOpen((prev) => !prev)}>
                        <div className="flex items-center w-full">
                            <FontAwesomeIcon className={`text-base w-8 duration-300 transition-all ${bazaDeDateOpen ? "rotate-90" : ""}`} icon={faChevronRight} />
                            <div className="flex items-center gap-2">
                                <div className='w-6 text-end'>
                                    <FontAwesomeIcon className='' icon={faServer} />
                                </div>
                                <div className="">Bază de date</div>
                            </div>
                        </div>
                    </div>

                {bazaDeDateOpen &&
                    <>
                            <div className="text-xl pl-4  hover:bg-gray-200 cursor-pointer py-1" onClick={() => setDateOpen((prev) => !prev)}>
                                <div className="flex items-center w-full" >
                                    <FontAwesomeIcon className={`text-base w-7 duration-300 transition-all ${dateOpen ? "rotate-90" : ""}`} icon={faChevronRight} />
                                    <div className="flex items-center gap-2">
                                        <div className='w-6'>
                                            <FontAwesomeIcon className='' icon={faFileShield} />
                                        </div>
                                        <div className="">Date</div>
                                    </div>
                                </div>
                            </div>
                            {dateOpen &&
                                <>
                                  <div onClick={() => navigate("/addArticles")} className="text-lg pl-12  hover:bg-gray-200 cursor-pointer py-1">
                                    <div  className="flex items-center gap-2 w-full" >
                                                <FontAwesomeIcon className='text-lg' icon={faDatabase} />
                                                Rețete
                                    </div>
                                </div>
                                <div onClick={() => navigate("/addManopere")} className="text-lg pl-12  hover:bg-gray-200 cursor-pointer py-1">
                                    <div className="flex items-center gap-2 w-full" >
                                                <FontAwesomeIcon className='text-lg' icon={faPerson} />
                                                Manoperă
                                    </div>
                                </div>
                                <div onClick={() => navigate("/addMateriale")} className="text-lg pl-12  hover:bg-gray-200 cursor-pointer py-1">
                                    <div className="flex items-center gap-2 w-full" >
                                                <FontAwesomeIcon className='text-lg' icon={faScrewdriverWrench} />
                                                Materiale
                                    </div>
                                </div>
                                <div onClick={() => navigate("/addTransport")} className="text-lg pl-12  hover:bg-gray-200 cursor-pointer py-1">
                                    <div className="flex items-center gap-2 w-full" >
                                                <FontAwesomeIcon className='text-lg' icon={faCar} />
                                                Transport
                                    </div>
                                </div>
                                <div onClick={() => navigate("/addUtilaje")} className="text-lg pl-12  hover:bg-gray-200 cursor-pointer py-1">
                                    <div className="flex items-center gap-2 w-full" >
                                                <FontAwesomeIcon className='text-lg' icon={faTruck} />
                                                Utilaje
                                    </div>
                                </div>
                                </>
                            }
                            <div className="text-xl pl-4  hover:bg-gray-200 cursor-pointer py-1" onClick={() => setUsersOpen((prev) => !prev)}>
                                <div className="flex items-center w-full" >
                                    <FontAwesomeIcon className={`text-base w-7 duration-300 transition-all ${usersOpen ? "rotate-90" : ""}`} icon={faChevronRight} />
                                    <div className="flex items-center gap-2">
                                        <div className='w-6'>
                                            <FontAwesomeIcon className='' icon={faUserPlus} />
                                        </div>
                                        <div className="">Conturi</div>
                                    </div>
                                </div>
                            </div>
                            {usersOpen &&
                                <>
                                <div onClick={() => navigate("/ManageOfertanti")} className="text-lg pl-12  hover:bg-gray-200 cursor-pointer py-1">
                                    <div className="flex items-center gap-2 w-full" >
                                                <FontAwesomeIcon className='text-lg' icon={faUserTie} />
                                                Ofertant
                                    </div>
                                </div>
                                <div onClick={() => navigate("/manageBeneficiari")} className="text-lg pl-12  hover:bg-gray-200 cursor-pointer py-1">
                                    <div className="flex items-center gap-2 w-full" >
                                                <FontAwesomeIcon className='text-lg' icon={faUser} />
                                                Beneficiar 
                                    </div>
                                </div>
                                <div onClick={() => navigate("/manageAngajati")} className="text-lg pl-12  hover:bg-gray-200 cursor-pointer py-1">
                                    <div className="flex items-center gap-2 w-full" >
                                                <FontAwesomeIcon className='text-lg' icon={faUsersGear} />
                                                Angajat
                                    </div>
                                </div>
                                </>
                            }
                            {/* <div className="text-xl pl-4  hover:bg-gray-200 cursor-pointer py-1" onClick={() => setPrezOpen((prev) => !prev)}>
                                <div className="flex items-center w-full" >
                                    <FontAwesomeIcon className={`text-base w-7 duration-300 transition-all ${prezOpen ? "rotate-90" : ""}`} icon={faChevronRight} />
                                    <div className="flex items-center gap-2">
                                        <div className='w-6 '>
                                            <FontAwesomeIcon className='' icon={faGears} />
                                        </div>
                                        <div className="">Prezentare</div>
                                    </div>
                                </div>
                            </div>
                            {prezOpen &&
                                <>
                                <div onClick={() => navigate("/addNews")} className="text-lg pl-12  hover:bg-gray-200 cursor-pointer py-1">
                                    <div className="flex items-center gap-2 w-full" >
                                                <FontAwesomeIcon className='text-lg' icon={faNewspaper} />
                                                News
                                    </div>
                                </div>
                                <div onClick={() => navigate("/addEchipa")} className="text-lg pl-12  hover:bg-gray-200 cursor-pointer py-1">
                                    <div className="flex items-center gap-2 w-full" >
                                        <FontAwesomeIcon className='text-lg' icon={faPeopleGroup} />
                                                Echipa 
                                    </div>
                                </div>
                                </>
                            } */}
                    </>}
                    <div className="text-2xl  hover:bg-gray-200 cursor-pointer py-1" onClick={() => setSantiereOpen((prev) => !prev)}>
                        <div className="flex items-center w-full">
                            <FontAwesomeIcon className={`text-base w-8 duration-300 transition-all ${santiereOpen ? "rotate-90" : ""}`} icon={faChevronRight} />
                            <div className="flex items-center gap-2">
                                <div className='w-6 text-end'>
                                    <FontAwesomeIcon className='' icon={faMapLocationDot} />
                                </div>
                                <div className="">Șantiere</div>
                            </div>
                        </div>
                    </div>
                    {
                        connectedSantiereToUser && santiereOpen &&
                        connectedSantiereToUser.map((beneficiar, index) => (
                            <div key={index}>
                                <div onClick={() => handleBeneficiarClick(beneficiar.id)} className="text-lg pl-4   hover:bg-gray-200 cursor-pointer py-1" >
                                    <div className="flex items-center w-full" >
                                        <FontAwesomeIcon className={`text-base px-2 duration-300 transition-all ${selectedBeneficiari.includes(beneficiar.id) ? ' transform rotate-90' : ''}`} icon={faChevronRight} />
                                        <div className="flex text-ellipsis  overflow-hidden items-center gap-2">
                                            <div className="w-6">
                                            <FontAwesomeIcon className="" icon={faUserTag} />
                                            </div>
                                            <div className="w-full overflow-hidden whitespace-nowrap text-ellipsis">
                                            {beneficiar.name}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {selectedBeneficiari.includes(beneficiar.id) &&
                                <>
                                {connectedSantiereToUser[index].santiere && connectedSantiereToUser[index].santiere.map((santier, idx) => (
                                    <div key={idx} onClick={() => navigate(`/Santiere/${beneficiar.limba}/${beneficiar.id}/${santier.id}`)} className="text-lg pl-12   hover:bg-gray-200 cursor-pointer py-1" >
                                       <div className="flex gap-2 items-center w-full" >
                                           <FontAwesomeIcon className={`text-base duration-300 transition-all`} onClick={() => console.log(connectedSantiereToUser)} icon={faChevronRight} />
                                           <div className="flex text-ellipsis  overflow-hidden items-center gap-2">
                                               <div className="w-6">
                                               <FontAwesomeIcon className="" icon={faHelmetSafety} />
                                               </div>
                                               <div className="w-full overflow-hidden whitespace-nowrap text-ellipsis">
                                               {santier.name}
                                               </div>
                                           </div>
                                       </div>
                                   </div>
                                ))}
                                    <div onClick={() => setAddSantier(beneficiar.id)} className="text-lg pl-12   hover:bg-gray-200 cursor-pointer py-1" >
                                        <div  className="flex items-center w-full" >
                                            <div className="flex text-ellipsis overflow-hidden items-center gap-2">
                                                <div className="w-6">
                                                <FontAwesomeIcon className="text-green-500" icon={faPlus} />
                                                </div>
                                                <div  className="w-full overflow-hidden whitespace-nowrap text-ellipsis">
                                                    Adaugă Șantier
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    </>
                                }
                            </div>
                        ))
                    } 
                </div>
                </>
                :
                ""
            }
          
          {/* bottom */}
          <div className='border-t-2 text-black border-black'>
            {user.name && !addSantier ?
                <div className='px-4 py-2 gap-4 grid grid-rows-[1fr_auto]'>
                    <div className="text-lg py-1 pl-1">
                        <div className='flex justify-between items-center'>
                            <div className="flex items-center gap-4 w-full" >
                                <div className='min-h-[40px] min-w-[40px] imgBx'>
                                    <img className='w-full h-full' src={photoStorage ? `${photoAPI}/${photoStorage}` : photo} alt="" />
                                </div>
                                <p>{user.name}</p>
                            </div>
                        </div>
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                        <button onClick={() => logout()} className='bg-red-500 cursor-pointer hover:bg-red-600 rounded-lg flex gap-2 items-center justify-center p-2'><FontAwesomeIcon icon={faRightToBracket}/>Logout</button>
                        <button onClick={() => navigate("/")} className='bg-green-500 cursor-pointer hover:bg-green-600  rounded-lg flex gap-2 items-center justify-center p-2'><FontAwesomeIcon icon={faHouse}/>Home</button>
                    </div>
                </div> 
            :
            user.name && addSantier ?
                <div className='px-4 py-2 gap-4 grid grid-rows-[1fr_auto]'>
                    <div className="text-lg py-1 flex gap-2 flex-col">
                        <label htmlFor="">Nume Santier:</label>
                        <input type="text" name='santierName' onChange={(e) => setSantierName(e.target.value)} className=' border-black w-full p-1 border-2 rounded-lg' />
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                        <button onClick={() => setAddSantier(false)} className='bg-red-500 cursor-pointer hover:bg-red-600 rounded-lg flex gap-2 items-center justify-center p-2'><FontAwesomeIcon icon={faCancel}/>Cancel</button>
                        <button onClick={() => addSantierToUser()} className='bg-green-500 cursor-pointer hover:bg-green-600  rounded-lg flex gap-2 items-center justify-center p-2'><FontAwesomeIcon icon={faPlus}/>Adauga</button>
                    </div>
                </div> 
            :
            ""
            }
          </div>
          </ul>
        </ul>
      </div>}
    </>
  )
}

export default Navbar;
