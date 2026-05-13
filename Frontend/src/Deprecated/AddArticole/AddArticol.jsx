import React, { useContext, useEffect, useState } from 'react';
import HorizontalForm from './HorizontalForm';
import FetchedArticles from './FetchedArticles';
import { ArticlesContext } from '../../context/ArticlesContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faLongArrowAltLeft, faLongArrowAltRight, faLongArrowRight } from '@fortawesome/free-solid-svg-icons';

export default function AddArticol() {
  const { clicked, handlePrevious, handleNext, setArticles, setTotalItems, setOffset, totalItems, articles, offset } = useContext(ArticlesContext);

  useEffect(() => {
    setArticles(null);
    setTotalItems(0);
    setOffset(0);
    console.log("ads");
  }, [clicked]);

  return (
    <>
      <div className="w-full relative h-full  gap-2 rounded-xl flex flex-col overflow-hidden    mt-4">
        {/* HorizontalForm */}
        <div className={` rounded-xl  bg-gray-800 `}>
          <HorizontalForm />
        </div>

        {/* FetchedArticles */}
        <div className="h-full grid grid-rows-[1fr_auto] w-full scrollbar-webkit overflow-hidden">
          <FetchedArticles />
          <div className='p-2 bg-gray-800 text-xl rounded-xl flex justify-between px-5'>
            <button className='px-2' onClick={() => handlePrevious()}><FontAwesomeIcon icon={faLongArrowAltLeft} /></button>
            <p className=''>{offset / 10}</p>
            <button className='px-2' onClick={() => handleNext()}><FontAwesomeIcon icon={faLongArrowAltRight} /></button>
          </div>
        </div>
      </div>

    </>
  );
}
