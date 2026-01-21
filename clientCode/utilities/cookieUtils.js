"use strict";

export function setCookie(cookieName, cookieValue, daysUntilExpiration)
{
    const expiryDate = new Date();

    expiryDate.setTime(expiryDate.getTime() + (daysUntilExpiration*24*60*60*1000));

    document.cookie = `${cookieName}=${cookieValue};Expires=${expiryDate.toUTCString()}`;
}

export function unsetCookie(cookieName)
{
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function cookieExists(cookieName)
{
    return document.cookie.split(";").some(c => c.startsWith(`${cookieName}=`));
}

export function cookieHasSpecificValue(cookieName, cookieValue)
{
    return document.cookie.split(";").some(c => c === `${cookieName}=${cookieValue}`);
}