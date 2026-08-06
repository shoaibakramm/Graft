import Papa from 'papaparse';





/** 
 * @param {File} file 
 * @returns {Promise<import('./parseContract').ParsedRow[]>}
 */
export function parseCSV(file) {

  return new Promise((resolve, reject) => {

    if (!file || !(file instanceof File)) 
    {
      reject(new Error('csvParser: received no file or invalid input.'));

      return;
    }

    const extension = file.name.split('.').pop().toLowerCase();

    if (extension !== 'csv') 
    {
      
      reject(new Error(`csvParser: expected a .csv file but got .${extension}`));

      return;

    }

    if (file.size === 0) 
    {
        console.log('File size is 0, resolving empty')

        resolve([]);
        return;

    }

    Papa.parse(file, {

      header: true,
      skipEmptyLines: true,

      dynamicTyping: false,

      transformHeader: (header) => header.trim(),

      transform: (value) => {

        if (value === null || value === undefined) 
        {
          return '';
        }

        return String(value).trim();
      
      },

      complete: (results) => {
        
        if (results.errors && results.errors.length > 0) 
        {

          const criticalErrors = results.errors.filter((e) => e.type === 'Quotes' || e.type === 'Delimiter');

          if (criticalErrors.length > 0) 
          {

            reject(new Error(`csvParser: critical parse error — ${criticalErrors[0].message}`));

            return;
          
          }

          console.warn('csvParser: non-critical parse warnings:', results.errors);
        
        }
    

        const headers = results.meta.fields || [];
    
        const normalized = results.data.map((row) => {

          const cleanRow = {};

          headers.forEach((header) => {

            cleanRow[header] = row[header] !== undefined && row[header] !== null ? String(row[header]).trim() : '';});

            return cleanRow;
          });
    
        // A trailing ",,," line survives skipEmptyLines and would read as a
        // phantom row with an empty id. Matches excelParser's behaviour.
        const filtered = normalized.filter((row) => Object.values(row).some((val) => val !== ''));

        resolve(filtered);
      
      },

      error: (error) => {

        reject(new Error(`csvParser: failed to read file — ${error.message}`));

      },
    });
  });
}