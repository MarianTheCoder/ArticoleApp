import React, { useContext } from 'react';
import { ArticlesContext } from '../../context/ArticlesContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenSquare, faPenToSquare, faTrashCan } from '@fortawesome/free-solid-svg-icons';

export default function FetchedArticles() {
  const { articles, editArticle, deleteArticle, setEditArticle } = useContext(ArticlesContext);

  return (
    <div className="bg-gray-00 w-full overflow-hidden">
      <div className="flex flex-col h-full justify-start items-center  ">
        <div className="w-full h-full overflow-y-auto mb-1  pr-1 scrollbar-webkit">
          {articles &&
            articles.map((article) => (
              <div
                key={article.id}
                className={`w-full p-3 px-6 mb-2 rounded-lg  ${editArticle != null ? editArticle.id == article.id ? "bg-blue-600  border-2 border-gray-800" : "bg-gray-800" : "bg-gray-800"}`}
              >
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center w-full">
                  {/* Code Display */}
                  <div className="flex  items-center">
                    <label className="font-medium text-white pr-2">Code</label>
                    <div className="w-32 px-2 text-center    py-1 border rounded-lg  text-gray-200 bg-gray-700 overflow-hidden text-ellipsis whitespace-nowrap">
                      {article.code}
                    </div>
                  </div>

                  {/* Description Display */}
                  <div className="flex  items-center">
                    <label className="font-medium text-white pr-2">Description</label>
                    <textarea value={article.description} readOnly rows={1} className=" outline-none resize-none px-2  py-1 border w-full max-w-[480px] rounded-lg  text-gray-200 bg-gray-700  overflow-y-auto break-words">
                    </textarea>
                  </div>

                  {/* Unit Display */}
                  <div className="flex  items-center">
                    <label className="font-medium text-white pr-2">Unit</label>
                    <div className="px-4  py-1 border rounded-lg text-gray-200 bg-gray-700 overflow-hidden text-ellipsis whitespace-nowrap">
                      {article.unit}
                    </div>
                  </div>

                  {/* Norma Display */}
                  <div className="flex  items-center">
                    <label className="font-medium text-white pr-2">Norma</label>
                    <div className="max-w-24 px-2 min-w-16 text-center  py-1 border rounded-lg  text-gray-200 bg-gray-700 overflow-hidden text-ellipsis whitespace-nowrap">
                      {article.norma}
                    </div>
                  </div>

                  {/* Data Display */}
                  <div className="flex  items-center">
                    <label className="font-medium text-white pr-2">Data</label>
                    <div className="col-span-2 px-4  py-1 border rounded-lg  text-gray-200 bg-gray-700 overflow-hidden text-ellipsis whitespace-nowrap">
                      {article.data.split('T')[0]}
                    </div>
                  </div>
                  <div className=' flex gap-5'>
                    <FontAwesomeIcon onClick={() => setEditArticle(article)} className='hover:cursor-pointer text-xl text-green-500 hover:text-green-600' icon={faPenToSquare} />
                    <FontAwesomeIcon onClick={() => deleteArticle(article.id)} className='hover:cursor-pointer hover:text-red-600 text-xl text-red-500' icon={faTrashCan} />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
