package websheets

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/tealeg/xlsx" //NEW VERSION BROKEN, USE COMMIT: 426ebfef635b70bf2b0f6f341b9a55ae82562029
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
					// if cell.Hyperlink.Link != "" {
					// ret[sheetIndex][rowIndex][colIndex] = cell.Hyperlink.Link
					// } else {
					ret[sheetIndex][rowIndex][colIndex] = cell.String()
					// }
				}
			}
		}
	}
	return ret, nil
}

//HandleConvertToSpreadsheet converts array of arrays in POST to .xlsx
func HandleConvertToSpreadsheet(w http.ResponseWriter, r *http.Request) {
	var file *xlsx.File
	var sheet *xlsx.Sheet
	var row *xlsx.Row
	var cell *xlsx.Cell
	var err error
	var fn, d []string
	var ok bool
	var parsedData [][]string
	type reqData struct {
		Filename string `json:"filename"`
		Data     string `json:"data"`
	}
	var rd reqData

	switch r.Header.Get("Content-type") {
	case "application/json":
		decoder := json.NewDecoder(r.Body)
		err = decoder.Decode(&rd)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	case "application/x-www-form-urlencoded":
		r.ParseForm()
		if fn, ok = r.Form["filename"]; ok {
			rd.Filename = strings.Join(fn, "")
		} else {
			rd.Filename = "spreadsheet.xlsx"
		}
		if d, ok = r.Form["data"]; !ok {
			http.Error(w, "No Data", http.StatusInternalServerError)
			return
		}
		rd.Data = strings.Join(d, "")
	default:
		http.Error(w, "Invalid content-type", http.StatusInternalServerError)
		return
	}
	err = json.Unmarshal([]byte(rd.Data), &parsedData)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	file = xlsx.NewFile()
	sheet, err = file.AddSheet("Sheet1")
	if err != nil {
		fmt.Printf(err.Error())
	}
	for _, r := range parsedData {
		row = sheet.AddRow()
		for _, c := range r {
			cell = row.AddCell()
			cell.Value = c
		}
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Description", "Generated .xlsx file")
	w.Header().Set("Content-Disposition", "attachment; filename="+rd.Filename)
	err = file.Write(w)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

}
