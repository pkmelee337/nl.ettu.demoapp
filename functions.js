getUsername = function() {
    return "mobile@ettudev.onmicrosoft.com";
};
getPassword = function() {
    return "ettu1337!";
};
getTenantName = function() {
    return "ettudev";
};
getRelativeUrl = function() {
    return "/sites/mobiletest";
};

var tokenReq = '<?xml version="1.0" encoding="utf-8"?>';
    tokenReq += '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">';
    tokenReq += '  <soap:Body>';
    tokenReq += '    <GetUpdatedFormDigestInformation xmlns="http://schemas.microsoft.com/sharepoint/soap/" />';
    tokenReq += '  </soap:Body>';
    tokenReq += '</soap:Envelope>';
 
// you should set these values according your actual request
var usr = getUsername();
var pwd = getPassword();
var siteBaseUrl = "https://" + getTenantName() + ".sharepoint.com";
var siteFullUrl = siteBaseUrl + getRelativeUrl();
   
var loginUrl = siteBaseUrl + "/_forms/default.aspx?wa=wsignin1.0";
var authReq =       '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://www.w3.org/2005/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">';
    authReq +=      '  <s:Header>';
    authReq +=      '    <a:Action s:mustUnderstand="1">http://schemas.xmlsoap.org/ws/2005/02/trust/RST/Issue</a:Action>';
    authReq +=      '    <a:MessageID>urn:uuid:40c1407d-b2a4-4e05-8248-8a92b71102b6</a:MessageID>';
    authReq +=      '    <a:ReplyTo>';
    authReq +=      '      <a:Address>http://www.w3.org/2005/08/addressing/anonymous</a:Address>';
    authReq +=      '    </a:ReplyTo>';
    authReq +=      '    <a:To s:mustUnderstand="1">https://login.microsoftonline.com/extSTS.srf</a:To>';
    authReq +=      '    <o:Security s:mustUnderstand="1" xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">';
    authReq +=      '      <o:UsernameToken u:Id="uuid-69882db9-2d6b-45d3-b016-c2156cb6c01d-1">';
    authReq +=      '        <o:Username>' + usr + '</o:Username>';
    authReq +=      '        <o:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">' + pwd + '</o:Password>';
    authReq +=      '      </o:UsernameToken>';
    authReq +=      '    </o:Security>';
    authReq +=      '  </s:Header>';
    authReq +=      '  <s:Body>';
    authReq +=      '    <t:RequestSecurityToken xmlns:t="http://schemas.xmlsoap.org/ws/2005/02/trust"><wsp:AppliesTo xmlns:wsp="http://schemas.xmlsoap.org/ws/2004/09/policy">';
    authReq +=      '      <a:EndpointReference>';
    authReq +=      '        <a:Address>' + loginUrl + '</a:Address>';
    authReq +=      '      </a:EndpointReference>';
    authReq +=      '      </wsp:AppliesTo>';
    authReq +=      '      <t:KeyType>http://schemas.xmlsoap.org/ws/2005/05/identity/NoProofKey</t:KeyType>';
    authReq +=      '      <t:RequestType>http://schemas.xmlsoap.org/ws/2005/02/trust/Issue</t:RequestType>';
    authReq +=      '      <t:TokenType>urn:oasis:names:tc:SAML:1.0:assertion</t:TokenType>';
    authReq +=      '    </t:RequestSecurityToken>';
    authReq +=      '  </s:Body>';
    authReq +=      '</s:Envelope>';
 
function startSharePointScript() {
    getToken();
}

var token;
// Step 1: we get the token from the STS
function getToken()
{
    $.support.cors = true; // enable cross-domain query
    $.ajax({
        type: 'POST',
        data: authReq,
        crossDomain: true, // had no effect, see support.cors above
        //contentType: 'application/soap+xml; charset=utf-8',
        url: 'https://login.microsoftonline.com/extSTS.srf',
        dataType: 'text',
        headers: { Accept: "application/soap+xml; charset=utf-8" },
        success: function (result) {
            // extract the token from the response data
            // var token = $(result.responseXML).find("wsse\\:BinarySecurityToken").text(); // we should work with responseText, because responseXML is undefined, due to Content-Type: application/soap+xml; charset=utf-8
            
            var xmlDoc = $.parseXML(result);
            var xml = $(xmlDoc);
            token = xml.find("wsse\\:BinarySecurityToken").text();
            if(token == null || token == "") {
                token = xml.find("BinarySecurityToken").text();
            }

            console.log("Token: " + token);
            getFedAuthCookies();
        },
        error: function (result, textStatus, errorThrown) {
            reportError(result, textStatus, errorThrown);
        }
    });
}
 
// Step 2: "login" using the token provided by STS in step 1
function getFedAuthCookies()
{
    $.support.cors = true; // enable cross-domain query
    $.ajax({
        // type: 'POST',
        // data: token,
        // crossDomain: true, // had no effect, see support.cors above
        // contentType: 'application/x-www-form-urlencoded',
        // url: loginUrl,

        type: 'POST',
        data: token,
        dataType: 'text',
        crossDomain: true, // had no effect, see support.cors above
        url: loginUrl,
        //dataType: 'html', // default is OK: Intelligent Guess (xml, json, script, or html)
        success: function (data, textStatus, result) {
            // we should update the digest
            //refreshDigestViaWS(); // or alternatively:
            refreshDigestViaREST();
            console.log("Logged in");
        },
        error: function (result, textStatus, errorThrown) {
            reportError(result, textStatus, errorThrown);
        }
    });

}
 
var digest;
// Step 3a: get the digest from the Sites web service and refresh the one stored locally
function refreshDigestViaWS()
{
    $.support.cors = true; // enable cross-domain query
    $.ajax({
        type: 'POST',
        data: tokenReq,
        crossDomain: true, // had no effect, see support.cors above
        contentType: 'text/xml; charset="utf-8"',
        url: siteFullUrl + '/_vti_bin/sites.asmx',
        headers: {
            'SOAPAction': 'http://schemas.microsoft.com/sharepoint/soap/GetUpdatedFormDigestInformation',
            'X-RequestForceAuthentication': 'true'
        },
        dataType: 'xml',
        success: function (data, textStatus, result) {
            digest = $(result.responseXML).find("DigestValue").text();
            console.log("Digest", digest);
            sendRESTReq();
        },
        error: function (result, textStatus, errorThrown) {
            reportError(result, textStatus, errorThrown);
        }
    });
}
 
// Step 3b: get the digest from the contextinfo and refresh the one stored locally
function refreshDigestViaREST()
{
    $.support.cors = true; // enable cross-domain query
    $.ajax({
        type: 'POST',
        data: tokenReq,
        crossDomain: true, // had no effect, see support.cors above
        contentType: 'text/xml; charset="utf-8"',
        url: siteFullUrl + '/_api/contextinfo',
        dataType: 'xml',
        success: function (data, textStatus, result) {
            digest = $(result.responseText).find("d\\:FormDigestValue").text();
            console.log("Refreshed digest", digest);
            sendRESTReq();
        },
        error: function (result, textStatus, errorThrown) {
            reportError(result, textStatus, errorThrown);
        }
    });
}
 
// Step 4: send the REST request
function sendRESTReq() {
    $.support.cors = true; // enable cross-domain query
    $.ajax({
        type: 'POST',
        data: "",
        url: siteFullUrl + "/_api/web/Title",
        // data: JSON.stringify({
        //     __metadata: { type: 'SP.List' },
        //     Title: 'RESTDocLib',
        //     BaseTemplate: 101
        // }),
        // equivalent:       
        // data: "{'__metadata': { 'type': 'SP.List' }, 'Title': 'RESTDocLib','BaseTemplate': 101}" ,
        //url: siteFullUrl + "/_api/web/lists",
        crossDomain: true, // had no effect, see support.cors above
        contentType: 'application/json;odata=verbose',
        headers: {
            'X-RequestDigest': digest,
            "Accept": "application/json; odata=verbose"
        },
        success: function (data, textStatus, result) {
            //console.log("Created");
            alert(data.d.Title);
        },
        error: function (result, textStatus, errorThrown) {
            reportError(result, textStatus, errorThrown);
        }
    });
}
 
function reportError(result, textStatus, errorThrown) {
    console.log(result, textStatus, errorThrown);
    // var response = JSON.parse(result.responseText);
    // if ((response.error !== undefined) && (response.error.message !== undefined)) {
    //     alert(response.error.message.value);
    // }
}

startSharePointScript();