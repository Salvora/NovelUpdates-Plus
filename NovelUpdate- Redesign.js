// ==UserScript==
// @name         NovelUpdates Redesign
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Redesigning Novelupdates
// @match        https://www.novelupdates.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Configuration variable to control the search bar
    const enableSearchBar = true;

    // Search URL template
    const searchUrlTemplate = '    https://www.novelupdates.com/series-finder/?sf=1&sh=${encodeURIComponent(query)}&sort=abc&order=desc';

    // Function to handle search
    function handleSearch(event) {
        if (event.key === 'Enter') {
            const query = event.target.value;
            if (query) {
                const searchUrl = searchUrlTemplate.replace('${encodeURIComponent(query)}', encodeURIComponent(query));
                window.location = searchUrl;
            }
        }
    }

    // Function to create and insert the search bar
    function createSearchBar() {
        const searchBar = document.createElement('input');
        searchBar.type = 'text';
        searchBar.className = 'searchinput';
        searchBar.id = 'newSearchBar';
        searchBar.placeholder = 'Search...';

        // Add event listener for the keypress event
        searchBar.addEventListener('keypress', handleSearch);

        return searchBar;
    }


    // Function to create custom list modification box
    function createCustomListModifier() {
        // Check if the page contains the specified <span> element
        const spanElement = document.querySelector('span[style="font-size: 14px; color:green;"]');
        if (!spanElement) {
            return; // Exit the function if the condition is not met
        }

        // Create a container for the input box and button
        const container = document.createElement('div');
        container.className = 'input-button-container';

        // Create the input box
        const inputBox = document.createElement('input');
        inputBox.type = 'text';
        inputBox.className = 'input-box';
        inputBox.placeholder = 'Enter text...';

        // Create the button
        const button = document.createElement('button');
        button.className = 'input-button';
        button.textContent = 'Submit';

        // Append the input box and button to the container
        container.appendChild(inputBox);
        container.appendChild(button);

        // Find the <h4 class="seriesother"> element
        const seriesOtherElement = document.querySelector('h4.seriesother');
        if (seriesOtherElement) {
            // Append the container to the <h4 class="seriesother"> element
            seriesOtherElement.appendChild(container);
        }

        // Add event listener to the button
        button.addEventListener('click', function() {
            // Get the input text
            const tdata = inputBox.value;

            // Get the sid value from the page
            const sidElement = document.querySelector('i[class*="fa-sticky-note-o seriesnotes sid"]');
            if (!sidElement) {
                console.error('SID element not found');
                return;
            }
            const sidClass = Array.from(sidElement.classList).find(cls => cls.startsWith('sid'));
            const sid = sidClass ? sidClass.replace('sid', '') : null;

            if (!sid) {
                console.error('SID value not found');
                return;
            }

            // Extract the lid value from the webpage
            const sttitleElement = document.querySelector('span.sttitle a[href*="reading-list/?list="]');
            if (!sttitleElement) {
                console.error('List ID element not found');
                return;
            }
            const lidMatch = sttitleElement.href.match(/list=(\d+)/);
            const lid = lidMatch ? lidMatch[1] : null;

            if (!lid) {
                console.error('List ID not found in URL');
                return;
            }

            // Construct the GET request URL
            const url = `https://www.novelupdates.com/readinglist_manualupdate.php?tdata=${encodeURIComponent(tdata)}&sid=${sid}&lid=${lid}`;

            // Make the GET request
            fetch(url)
                .then(response => response.text()) // Use response.text() instead of response.json()
                .then(data => {
                    console.log('Success:', data);

                    // Update a part of the webpage with the response data
                    const spanElement = document.querySelector('span[style="font-size: 14px; color:green;"]');
                    if (spanElement) {
                        spanElement.textContent = ` (${tdata})`;
                    }

                    // Clear the text box
                    inputBox.value = '';

                    // Flash the button to indicate success
                    button.classList.add('success');
                    setTimeout(() => {
                        button.classList.remove('success');
                    }, 500); // Remove the class after 500ms
                })
                .catch((error) => {
                    console.error('Error:', error);
                });
        });

    }

    // Function to add the search bar to the DOM
    function addSearchBar(targetElement) {
        if (enableSearchBar && !document.getElementById('newSearchBar')) {
            const searchBar = createSearchBar();
            targetElement.appendChild(searchBar);
        }
    }

    // Check for logged in status
    function isUserLoggedIn() {
        const usernameElement = document.querySelector('.username');
        return usernameElement !== null;
    }

    // Function to inject CSS styles
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
        #newSearchBar {
            margin-left: 15px;
            width: 10rem;
            height: 2rem;
            padding: 1rem;
            border-radius: 4px;
            border: 1px solid #ccc;
            box-sizing: border-box;
            font-size: 1rem;
            color: #666;
            font-weight: 400;
            font-family: 'Open Sans';
        }
        #newSearchBar::placeholder {
            color: #999;
            opacity: 1;
        }
        .input-button.success {
            background-color: #4CAF50; /* Green background to indicate success */
            color: white;
        }
    `;
    
        document.head.appendChild(style);
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

        const observer = new MutationObserver((mutations, observer) => {
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
        injectStyles();
        observeDOM('menu_username_right', addSearchBar, '.l-subheader-h.i-widgets.i-cf'); // Using the parent class
        if (isUserLoggedIn() && window.location.href.startsWith('https://www.novelupdates.com/series/')) {
            createCustomListModifier();
        }
    }

    // Run the main function
    init();
})();