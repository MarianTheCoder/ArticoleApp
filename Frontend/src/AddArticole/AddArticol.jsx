import React, { useContext, useEffect } from 'react';
import HorizontalForm from './HorizontalForm';
import FetchedArticles from './FetchedArticles';
import { ArticlesContext } from '../context/ArticlesContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLongArrowAltLeft, faLongArrowAltRight, faLongArrowRight } from '@fortawesome/free-solid-svg-icons';

export default function AddArticol() {
  const {clicked, handlePrevious , handleNext, setArticles, setTotalItems, setOffset,  totalItems ,articles, offset } = useContext(ArticlesContext);

  useEffect(() => {
    setArticles(null);
    setTotalItems(0);
    setOffset(0);
    console.log("ads");
  }, [clicked]);


  return (
    <div className="w-full h-full flex flex-col bg-gray-800 rounded-xl mt-4 overflow-hidden">
      {/* HorizontalForm */}
      <div className="flex-shrink-0">
        <HorizontalForm />
      </div>

      {/* FetchedArticles */}
      <div className="flex-grow overflow-hidden">
        <FetchedArticles />
      </div>
      <div className='p-2 bg-gray-800 text-xl flex justify-between px-5'>
          <button className='px-2' onClick={() => handlePrevious()}><FontAwesomeIcon icon={faLongArrowAltLeft}/></button>
          <p className=''>{offset / 10}</p>
          <button className='px-2' onClick={() => handleNext()}><FontAwesomeIcon icon={faLongArrowAltRight}/></button>
      </div>
    </div>
  );
}
