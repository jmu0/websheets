package websheets

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"

	"github.com/tealeg/xlsx"
)

//HandleSpreadsheetUpload handle spreadsheet upload
func HandleSpreadsheetUpload(w http.ResponseWriter, r *http.Request) {

	var ret = make(map[string]map[int]map[int]map[int]string)
	var tmpfile *os.File
	var tmpPath string
	var (
		status int
		err    error
		infile multipart.File
	)
	defer func() {
		if nil != err {
			log.Println("ERROR:", err.Error())
			infile.Close()
			http.Error(w, err.Error(), status)
		}
	}()
	// parse request
	const _24K = (1 << 20) * 24
	if err = r.ParseMultipartForm(_24K); nil != err {
		status = http.StatusInternalServerError
		return
	}
	for _, fheaders := range r.MultipartForm.File {
		for _, hdr := range fheaders {
			tmpPath = hdr.Filename
			// open uploaded
			if infile, err = hdr.Open(); nil != err {
				status = http.StatusInternalServerError
				return
			}
			if tmpfile, err = os.Create(tmpPath); nil != err {
				log.Println("Could not create tempfile:", tmpPath, err)
				status = http.StatusInternalServerError
				return
			}
			if _, err = io.Copy(tmpfile, infile); nil != err {
				log.Println("Error: could not write tempfile:", tmpPath, err)
				status = http.StatusInternalServerError
				return
			}
			infile.Close()
			tmpfile.Close()

			switch filepath.Ext(tmpPath) {
			case ".xlsx":
				ret[tmpPath], err = readXlsxFile(tmpPath)
				if err != nil {
					status = http.StatusInternalServerError
					return
				}
			case ".csv":
				//TODO: https://appliedgo.net/spreadsheet/
			default:
				err = errors.New("Invalid filetype: " + tmpPath)
				status = http.StatusInternalServerError
				return
			}

			err = os.Remove(tmpPath)
			if err != nil {
				log.Println("Could not remove tempfile:", tmpPath, err)
				status = http.StatusInternalServerError
				return
			}
		}

		bytes, err := json.Marshal(ret)
		if err != nil {
			status = http.StatusInternalServerError
			return
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Write(bytes)
	}
}

func readXlsxFile(filename string) (map[int]map[int]map[int]string, error) {
	var ret = make(map[int]map[int]map[int]string)
	xlFile, err := xlsx.OpenFile(filename)
	if err != nil {
		return ret, err
	}
	for sheetIndex, sheet := range xlFile.Sheets {
		if _, ok := ret[sheetIndex]; !ok {
			ret[sheetIndex] = make(map[int]map[int]string)
		}
		for rowIndex, row := range sheet.Rows {
			for colIndex, cell := range row.Cells {
				if len(cell.String()) > 0 {
					if _, ok := ret[sheetIndex][rowIndex]; !ok {
						ret[sheetIndex][rowIndex] = make(map[int]string)
					}
					ret[sheetIndex][rowIndex][colIndex] = cell.String()
				}
			}
		}
	}
	return ret, nil
}
