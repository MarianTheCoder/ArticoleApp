import { useContext, useEffect, useState } from 'react';
import "../assets/navbar.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowsSpin, faEye, faFilePen, faHelmetSafety, faHouse, faL, faNewspaper, faPeopleGroup, faPhone, faRightFromBracket, faUser, faUserPlus } from "@fortawesome/free-solid-svg-icons"; 
import photo from '../assets/no-user-image-square.jpg';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/TokenContext';
import Logo from '../assets/logo.svg';
import {useLocation} from 'react-router-dom';
import photoAPI from '../api/photoAPI';

function Navbar() {

    const [active, setActive] = useState(false);
    const [selected, setSelected] = useState(0);

    let navigate = useNavigate();
    const location = useLocation();
    const {user, logout} = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const photoStorage = localStorage.getItem("photoUser");

    useEffect(() => {
         if(location.pathname.includes("News")) setSelected(1);
        else if(location.pathname.includes("Echipa")) setSelected(2);
        else if(location.pathname.includes("Contact")) setSelected(3);
        else setSelected(0);
        setLoading(false);
    }, [])
    

  return (
    <>
   
      {!loading && <div  className={`sidebar text-xl  ${active == true ? "active" : ""}`}>
        <ul>
          <li className='logo' style={{"--bg":"#333"}}>
            <a className=' cursor-default'>
              <div className='icon'><div onClick={() => setActive(!active)} className={`menuToggle ${active == true ? "active" : ""}`}></div></div>
              <div className="flex items-center">
                <img src={Logo} alt="Website Logo" className={`transition-all duration-500 w-full ${active == false ? "opacity-0" : ""}`} />
               </div>
            </a>
          </li>
          <div className=' Menulist'>
            <li onClick={() => setSelected(0)} style={{"--bg":"#ffa117"}} className={` cursor-pointer ${selected == 0 ? "active" : ""}`}>
                <a onClick={() => navigate("/defaultHome")}>
                    <div className='icon'><FontAwesomeIcon icon={faHouse}/></div>
                    <div className='text'>Home</div>
                </a>
            </li>
                <li onClick={() => setSelected(1)} style={{"--bg":"#f44336"}} className={`cursor-pointer ${selected == 1 ? "active" : ""}`}>
                    <a onClick={() => navigate("/defaultHome/News")}>
                        <div className='icon'><FontAwesomeIcon icon={faNewspaper}/></div>
                        <div className='text'>News</div>
                    </a>
                </li>
                <li onClick={() => setSelected(2)} style={{"--bg":"#0fc70f"}} className={`cursor-pointer ${selected == 2 ? "active" : ""}`}>
                <a onClick={() => navigate("/defaultHome/Echipa")}>
                        <div className='icon'><FontAwesomeIcon icon={faUser}/></div>
                        <div className='text'>Echipa</div>
                    </a>
                </li>
                <li onClick={() => setSelected(3)} style={{"--bg":"#2196f3"}} className={`cursor-pointer ${selected == 3 ? "active" : ""}`}>
                    <a onClick={() => navigate("/defaultHome/Contact")}>
                        <div className='icon'><FontAwesomeIcon icon={faPhone}/></div>
                        <div className='text'>Contact</div>
                    </a>
                </li>
          </div>
          {/* bottom */}
          <div className='bottom'>
       {user.name ? 
       <>
              <li style={{"--bg":"#333"}}>
                <a className=' cursor-pointer'>
                    <div className='icon'>
                        <div className='imgBx'>
                        <img src={photoStorage ? `${photoAPI}/${photoStorage}` : photo} alt="" />
                        </div>
                    </div>
                    <div className='text'>{user.name}</div>
                </a>
            </li>
            <li style={{"--bg":"#333"}}>
                <a className=' cursor-pointer' onClick={() => navigate("/")}>
                    <div className='icon'><FontAwesomeIcon icon={faArrowsSpin}/></div>
                    <div className='text'>Loged Home</div>
                </a>
            </li>
            <li style={{"--bg":"#333"}}>
                <a className=' cursor-pointer' onClick={() => logout()}>
                    <div className='icon'><FontAwesomeIcon icon={faRightFromBracket}/></div>
                    <div className='text'>Logout</div>
                </a>
            </li>
            </>
            :
            <li style={{"--bg":"#333"}} className='cursor-pointer'>
                <a onClick={() => navigate("/login")}>
                    <div className='icon'><FontAwesomeIcon icon={faRightFromBracket}/></div>
                    <div className='text'>Login</div>
                </a>
             </li> 
        }
          </div>
        </ul>
      </div>}
      <div className='w-0'></div>
    </>
  )
}

export default Navbar;
