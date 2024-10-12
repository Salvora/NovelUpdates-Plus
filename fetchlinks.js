(function () {
    'use strict';

    // Function to get the post ID from the DOM
    function getPostID() {
        const postIDElement = document.querySelector('#mypostid');
        console.log(postIDElement);
        return postIDElement ? postIDElement.value : null;
    }

    // Function to fetch the real URL for a masked link
    async function fetchRealURL(maskedURL) {
        try {
            const response = await fetch(maskedURL, {
                method: 'HEAD',
                mode: 'cors',
                headers: {
                    'Referrer': document.referrer // Set the Referrer header to the current document's referrer
                }
            });

            return response.url; // The actual URL after redirection
        } catch (error) {
            console.error('Error fetching real URL:', error);
            return null;
        }
    }

    // Function to replace the masked links with the real ones
    async function replaceMaskedLinks() {
        const mypostid = getPostID();
        console.log(mypostid);
        if (!mypostid) {
            console.error('Post ID not found');
            return;
        }

        try {
            const response = await fetch("https://www.novelupdates.com/wp-admin/admin-ajax.php", {
                "credentials": "include",
                "headers": {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "X-Requested-With": "XMLHttpRequest",
                    "Sec-GPC": "1",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin",
                },
                "referrer": window.location.href, // Set referrer to the current page URL
                "body": `action=nd_getchapters&mygrr=0&mypostid=${mypostid}`,
                "method": "POST",
                "mode": "cors"
            });

            const responseText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(responseText, 'text/html');

            const links = doc.querySelectorAll('a[data-id]'); // Select masked links within the response document
            console.log(links);

            // Replace the masked links in the original document
            for (let link of links) {
                const maskedURL = link.getAttribute('href');
                const realURL = await fetchRealURL(maskedURL);
                if (realURL) {
                    const originalLink = document.querySelector(`a[data-id="${link.getAttribute('data-id')}"]`);
                    if (originalLink) {
                        originalLink.setAttribute('href', realURL); // Replace with real URL
                    }
                }
                // Delay to avoid overloading the server
                await new Promise(resolve => setTimeout(resolve, 100)); // Adjust the delay as needed
            }
        } catch (error) {
            console.error('Error fetching or processing data:', error);
        }
    }

    // Async function to observe the DOM for the target element
    async function observeDOM(targetId, callback, parentClass) {
        const parentElement = document.querySelector(parentClass);
        if (!parentElement) return;

        let targetElement = document.getElementById(targetId);
        if (targetElement) {
            callback(targetElement);
            return;
        }

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    targetElement = document.getElementById(targetId);
                    if (targetElement) {
                        callback(targetElement);
                        observer.disconnect(); // Stop observing once the element is found
                        break;
                    }
                }
            }
        });

        observer.observe(parentElement, { childList: true, subtree: true });

        // Wait until the target element is found
        while (!targetElement) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Polling interval
            targetElement = document.getElementById(targetId);
        }
    }

    // Main function to initialize the script
    function init() {
        observeDOM('mypostid', replaceMaskedLinks, '.l-main'); // Using the parent class
    }

    // Run the main function
    init();

})();