"use strict";

export function postData(url, data)
{
    return fetch(url,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        })
        .then(status)
        .then(response => response.json())
        .catch(error => console.error(error));
}

export function fetchHtml(url)
{
	return fetch(url)
		.then(status)
		.then(response => response.text())
		.catch(error => console.error(error));
}

function status(response)
{
	if (response.status >= 200 && response.status < 300)
		return Promise.resolve(response);
	
	return Promise.reject(new Error(response.statusText));
}