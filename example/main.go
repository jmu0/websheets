package main

import (
	"log"
	"net/http"

	"github.com/jmu0/websheets"
)

var port = ":8080"

func main() {
	mx := http.NewServeMux()
	mx.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "index.html")
	})
	mx.HandleFunc("/xls", websheets.HandleSpreadsheetUpload)
	log.Println("Listening on port:", port)
	log.Fatal(http.ListenAndServe(port, mx))
}
