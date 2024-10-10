// ==UserScript==
// @name         NovelUpdates Redesign
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Redesigning Novelupdates
// @match        https://www.novelupdates.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Configuration variable to control the search bar
    const enableSearchBar = true;

    // Search URL template
    const searchUrlTemplate = 'https://www.novelupdates.com/series-finder/?sf=1&sh=${query}&sort=abc&order=desc';

    let ChapterIdentifier;
    let inputBox;
    let button;
    let navlinksfragment;
    let Navlinks;
    let custom_chapter_number;

    // Function to handle search when "Enter" is pressed
    function handleSearch(event) {
        if (event.key === 'Enter') {
            const query = event.target.value.trim(); // Trim whitespace
            if (query) {
                const searchUrl = searchUrlTemplate.replace('${query}', encodeURIComponent(query));
                window.location.href = searchUrl;
            }
        }
    }

    // Function to create and insert the search bar
    function createSearchBar() {
        const searchBar = document.createElement('input');
        searchBar.type = 'text';
        searchBar.className = 'custom-search-bar';
        searchBar.id = 'newSearchBar';
        searchBar.placeholder = 'Search...';

        // Add event listener for the keypress event
        searchBar.addEventListener('keypress', handleSearch);

        return searchBar;
    }

    function isCustomList() {
        const ChapterIdentifier = document.querySelector('span[style="font-size: 14px; color:green;"]');
        if (ChapterIdentifier) {
            const raw_chapter_number = ChapterIdentifier.textContent;
            const start = raw_chapter_number.indexOf('(');
            const end = raw_chapter_number.indexOf(')');
            if (start !== -1 && end !== -1 && start < end) {
                custom_chapter_number = raw_chapter_number.substring(start + 1, end);
                return true; // Return true if the value inside the parentheses is found
            }
        }
        custom_chapter_number = null; // Reset the global variable if not found
        return false; // Return false if the element or the value is not found
    }


    function ExtractChapterPlaceholder() {
        if (ChapterIdentifier) {
            const raw_chapter_number = ChapterIdentifier.textContent.trim();
    
            // Regular expression with named capture groups
            const match = raw_chapter_number.match(/\(?(?:v|vol)?(?<vol>\d+)?(?:c|ch)?(?<ch>\d+(\.\d+)?)(?<chsfx>[a-zA-Z]?)\)?/i);
    
            if (match) {
                // Extract the volume number (only if it is preceded by 'v' or 'vol')
                const volume_number = match.groups.vol ? parseInt(match.groups.vol, 10) : null; // Volume number or null
    
                // Determine the chapter number and suffix
                const chapter_number = match.groups.ch ? parseFloat(match.groups.ch) : null; // Chapter number (float if needed)
                const chapter_suffix = match.groups.chsfx || null; // Capture optional chapter suffix
    
                custom_chapter_number = {
                    vol_number: volume_number, // Volume number or null
                    ch_number: chapter_number, // Chapter number (float if needed)
                    ch_suffix: chapter_suffix // Chapter suffix or null
                };
    
                console.log(custom_chapter_number);
                return true;
            }
        }
    
        custom_chapter_number = null; // Reset if no match is found
        return false;
    }
    
    
    
    
    
    
    
    
    
    
    


    function CreateInputBox() {
        // Create the input box
        inputBox = document.createElement('input');
        inputBox.type = 'text';
        inputBox.className = 'input-box';
        inputBox.placeholder = 'Enter Chapter Number...';
        return;
    }

    function CreateSubmitButton() {
        // Create the button
        button = document.createElement('button');
        button.className = 'submit-button';
        button.textContent = 'Submit';
        return;
    }

    // Function to create custom list navigation links
    function CreateCustomListNavigationLinks() {
        // Create a document fragment to hold the links
        navlinksfragment = document.createDocumentFragment();
    
        // Create the links
        Navlinks = [
            { text: '-1', title: 'Decrement Chapter -1', delta: -1 },
            { text: '-5', title: 'Decrement Chapter -5', delta: -5 },
            { text: '-10', title: 'Decrement Chapter -10', delta: -10 },
            { text: '+1', title: 'Increment Chapter +1', delta: 1 },
            { text: '+5', title: 'Increment Chapter +5', delta: 5 },
            { text: '+10', title: 'Increment Chapter +10', delta: 10 }
        ];
    
        Navlinks.forEach(link => {
            const a = document.createElement('a');
            a.href = 'javascript:void(0)';
            a.title = link.title;
            a.innerHTML = `<u>${link.text}</u>`;
            a.className = 'custom-link'; // Add a class to each link
            navlinksfragment.appendChild(a); // Append the link to the fragment
            link.element = a; // Store the created element in the link object
        });
        return;
    }


    // Function to create the custom list modifier box
    function createCustomListModifier() {

        // Create a container for the input box and submit button
        const container = document.createElement('div');
        container.className = 'submit-button-container';

        CreateInputBox();
        CreateSubmitButton();
        CreateCustomListNavigationLinks(); // Get the links fragment


        // Append the input box and button to the container
        container.appendChild(inputBox);
        container.appendChild(button);
        container.appendChild(navlinksfragment); // Append the links fragment to the container

        // Find the <h4 class="seriesother"> element
        const seriesOtherElement = document.querySelector('h4.seriesother');
        if (seriesOtherElement) {
            // Append the container to the <h4 class="seriesother"> element
            seriesOtherElement.appendChild(container);
        }

        CustomListEventListeners();


    }

    function CustomListEventListeners() {
        // Add event listener to the submit button
        button.addEventListener('click', async () => {
            const tdata = inputBox.value.trim();
            if (!tdata) return;
            await ChangeChapter(tdata);
        });
    
        // Add event listeners to the navigation links
        Navlinks.forEach(link => {
            const a = link.element; // Use the stored element
            if (a) {
                a.addEventListener('click', async () => {
                    const delta = link.delta;
                    await ChangeChapter(delta);
                });
            }
        });
    }

    async function ChangeChapter(chapter) {
        // Extract sid and lid from the webpage
        const sid = extractSid();
        const lid = extractLid();
        if (!sid || !lid) {
            console.error('Failed to retrieve required values (SID or LID).');
            updateUI(ChapterIdentifier, chapter, inputBox, button, false);
            return;
        }
    
        const updateURL = `https://www.novelupdates.com/readinglist_manualupdate.php?tdata=${encodeURIComponent(chapter)}&sid=${sid}&lid=${lid}`;
    
        // Create an AbortController to handle the timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // Set timeout to 5000ms (5 seconds)
    
        let success = false;
    
        try {
            const response = await fetch(updateURL, { signal: controller.signal });
            clearTimeout(timeoutId); // Clear the timeout if the request completes in time
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.text();
            console.log('Success:', data);
            success = true;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('Fetch request timed out');
            } else {
                console.error('Error:', error);
            }
        } finally {
            updateUI(ChapterIdentifier, chapter, inputBox, button, success);
        }
    }

    
    // Extract SID value from the page
    function extractSid() {
        const sidElement = document.querySelector('i[class*="fa-sticky-note-o seriesnotes sid"]');
        if (!sidElement) {
            console.error('SID element not found');
            return null;
        }
        const sidClass = Array.from(sidElement.classList).find(cls => cls.startsWith('sid'));
        return sidClass ? sidClass.replace('sid', '') : null;
    }

    // Extract LID value from the page
    function extractLid() {
        const sttitleElement = document.querySelector('span.sttitle a[href*="reading-list/?list="]');
        if (!sttitleElement) {
            console.error('List ID element not found');
            return null;
        }
        const lidMatch = sttitleElement.href.match(/list=(\d+)/);
        return lidMatch ? lidMatch[1] : null;
    }

    // Update the UI on successful or failed submission
    function updateUI(spanElement, tdata, inputBox, button, result) {
        // Update a part of the webpage with the response data if successful
        if (result) {
            spanElement.textContent = ` (${tdata})`;
        }

        // Store the original button text
        const originalButtonText = button.textContent;

        // Set the button's min-width to its current width to preserve size
        const buttonWidth = button.offsetWidth;
        button.style.minWidth = `${buttonWidth}px`;

        // Flash the button to indicate success or failure
        if (result) {
            button.textContent = '✔'; // Change the button text to a tick mark
            button.classList.add('success');
            // Clear the text box
            inputBox.value = '';

        } else {
            button.textContent = '✖'; // Change the button text to an X mark
            button.classList.add('failure');
        }

        setTimeout(() => {
            button.classList.remove('success', 'failure');
            button.textContent = originalButtonText; // Revert back to the original text
            button.style.minWidth = ''; // Reset the min-width
        }, 500); // Remove the class and revert text after 500ms
    }

    // Function to add the search bar to the DOM
    function addSearchBar(targetElement) {
        if (enableSearchBar && !document.getElementById('newSearchBar')) {
            const searchBar = createSearchBar();
            targetElement.appendChild(searchBar);
        }
    }

    // Check for logged-in status
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
        .submit-button.success {
            background-color: #4CAF50; /* Green background to indicate success */
            color: white;
        }
        .submit-button.failure {
            background-color: #f44336; /* Red background to indicate failure */
            color: white;
        }
        .submit-button {
            margin-right: 1rem; /* Add top margin for spacing */
        }
        .custom-link {
            margin-right: 1rem; /* Add right margin for spacing */
        }
        .input-box::placeholder {
            color: #999;
            opacity: 1;
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
        injectStyles();
        observeDOM('menu_username_right', addSearchBar, '.l-subheader-h.i-widgets.i-cf'); // Using the parent class
        if (isUserLoggedIn() && window.location.href.startsWith('https://www.novelupdates.com/series/')) {
            if(isCustomList()) {
                createCustomListModifier();
                ExtractChapterPlaceholder();
            }
        }
    }

    // Run the main function
    init();
})();
