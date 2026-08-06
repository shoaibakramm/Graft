import { useState } from 'react';
import { parseFile, isSupportedFile, getFileTypeLabel } from './parseFile';





function FileUploader({ onDataParsed, onError }) {


  const [status, setStatus] = useState('idle');                                   // idle | validating | parsing | done | error



  const [statusMessage, setStatusMessage] = useState('');



  const [fileName, setFileName] = useState('');


  function handleFileChange(event) {

    const file = event.target.files[0];


    if (!file) 
    {
      return;
    }

    setFileName(file.name);



    setStatus('validating');

    setStatusMessage(`Validating ${file.name}...`);



    if (!isSupportedFile(file)) 
    {
      const errorMsg = (`Unsupported file type: "${file.name}". ` + `Please upload a .csv, .xlsx, or .xls file.`);

      setStatus('error');
      
      setStatusMessage(errorMsg);
      
      if (onError) 
      {
        onError(errorMsg);
      }

      event.target.value = '';

      return;
      
    }


    const fileTypeLabel = getFileTypeLabel(file);

    setStatus('parsing');
    
    
    setStatusMessage(`Parsing ${fileTypeLabel} file...`);

    parseFile(file)
      .then((rows) => {

        setStatus('done');

        setStatusMessage(`Done. Parsed ${rows.length} rows from "${file.name}".`);

        if (onDataParsed) 
        {
          onDataParsed(rows);
        }

      })
      .catch((error) => {

        setStatus('error');

        setStatusMessage(`Error: ${error.message}`);

        if (onError)
        {
          onError(error.message);
        } 

      });

    event.target.value = '';
  }

  return (

    <div className="file-uploader">
      <label className="file-uploader__label">
        Upload a CSV or Excel file
      </label>

      <input
        className="file-uploader__input"
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChange}
      />



      {status !== 'idle' && (
        <div className={`file-uploader__status file-uploader__status--${status}`}>

          {(status === 'validating' || status === 'parsing') && (
            <span className="file-uploader__spinner">⏳ </span>
          )}


          {status === 'done' && (
            <span className="file-uploader__icon">✅ </span>
          )}

          {status === 'error' && (
            <span className="file-uploader__icon">❌ </span>
          )}

          {statusMessage}
        </div>
      )}
    </div>
  );
}

export default FileUploader;