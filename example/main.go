package main

import (
	"log"
	"net/http"

	"github.com/jmu0/websheets"
)

var port = ":8080"

func main() {
	mx := http.NewServeMux()
	// mx.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
	// 	http.ServeFile(w, r, "./static/index.html")
	// })
	mx.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Serving:", r.URL.Path)
		http.FileServer(http.Dir(".")).ServeHTTP(w, r)
	})
	mx.HandleFunc("/upload", websheets.HandleSpreadsheetUpload)
	mx.HandleFunc("/download", websheets.HandleConvertToSpreadsheet)
	log.Println("Listening on port:", port)
	log.Fatal(http.ListenAndServe(port, mx))
}
