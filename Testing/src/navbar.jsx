import { useState } from 'react';
import "./assets/navbar.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faHouse, faNewspaper, faPhone, faRightFromBracket, faUser } from "@fortawesome/free-solid-svg-icons"; 
import photo from './assets/no-user-image-square.jpg';

function navbar() {

    const [active, setActive] = useState(false);
    const [selected, setSelected] = useState(0);

  return (
    <>
    <div onClick={() => setActive(!active)} className={`menuToggle ${active == true ? "active" : ""}`}></div>
      <div  className={`sidebar ${active == true ? "active" : ""}`}>
        <ul>
          <li className='logo' style={{"--bg":"#333"}}>
            <a href="#">
              <div className='icon'><FontAwesomeIcon icon={faEye}/></div>
              <div className='text'>Website Logo</div>
            </a>
          </li>
          <div className='Menulist'>
            <li onClick={() => setSelected(0)} style={{"--bg":"#ffa117"}} className={` ${selected == 0 ? "active" : ""}`}>
                <a href="#">
                    <div className='icon'><FontAwesomeIcon icon={faHouse}/></div>
                    <div className='text'>Home</div>
                </a>
            </li>
            <li onClick={() => setSelected(1)} style={{"--bg":"#f44336"}} className={` ${selected == 1 ? "active" : ""}`}>
                <a href="#">
                    <div className='icon'><FontAwesomeIcon icon={faNewspaper}/></div>
                    <div className='text'>News</div>
                </a>
            </li>
            <li onClick={() => setSelected(2)} style={{"--bg":"#0fc70f"}} className={` ${selected == 2 ? "active" : ""}`}>
                <a href="#">
                    <div className='icon'><FontAwesomeIcon icon={faUser}/></div>
                    <div className='text'>Echipa</div>
                </a>
            </li>
            <li onClick={() => setSelected(3)} style={{"--bg":"#2196f3"}} className={` ${selected == 3 ? "active" : ""}`}>
                <a href="#">
                    <div className='icon'><FontAwesomeIcon icon={faPhone}/></div>
                    <div className='text'>Contact</div>
                </a>
            </li>
          </div>
          {/* bottom */}
          <div className='bottom'>
            <li style={{"--bg":"#333"}}>
                <a href="#">
                    <div className='icon'>
                        <div className='imgBx'>
                             <img src={photo} alt="" />
                        </div>
                    </div>
                    <div className='text'>Ciobanu Marian</div>
                </a>
            </li>
            <li style={{"--bg":"#333"}}>
                <a href="#">
                    <div className='icon'><FontAwesomeIcon icon={faRightFromBracket}/></div>
                    <div className='text'>Logout</div>
                </a>
            </li>
          </div>
        </ul>
      </div>
    </>
  )
}

export default navbar;
