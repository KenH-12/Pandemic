"use strict";

export function postData(url, data)
{
    return new Promise(async (resolve, reject) =>
    {
        const response = await fetch(url,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            })
            .then(status)
            .then(checkFatalError)
            .then(json)
            .catch(reject);
        
        resolve(response);
    });
}

export function getData(url)
{
    return fetch(url,
        {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        })
        .then(status)
        .then(json)
        .catch(error => console.error(error));
}

export function fetchHtml(url)
{
	return fetch(url)
		.then(status)
		.then(response => response.text())
		.catch(error => console.error(error));
}

function json(response)
{
    return response.json()
}

function status(response)
{
	if (response.status >= 200 && response.status < 300)
		return Promise.resolve(response);
	
	return Promise.reject(new Error(response.statusText));
}

async function checkFatalError(response)
{
    // PHP fatal errors cannot be parsed as json.
    const fatalError = await response.clone().text()
        .then(result => result.includes("Fatal error") ? result : false);

    if (fatalError)
        return Promise.reject(new Error(fatalError));
}