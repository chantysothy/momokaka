
function getpagelist(userfbid) { 
    $.ajax({
        type: "GET",
        url: "/" + userfbid + "/getpagelist",
        beforeSend: function (xhr, opts) {
            document.getElementById("button-spinner").style.display = "block";
            document.getElementById("button-addPage").style.display = "none";
        },
        complete: function () {
            document.getElementById("button-spinner").style.display = "none";
            document.getElementById("button-addPage").style.display = "block";
        }
    }).done(function (data) {
        document.getElementById("pageslist").classList.toggle("show");
        $("#pageslist").html(data);
    });
};

function activatewebhook(evt, pageid) {
    $.ajax({
        type: "GET",
        url: "/" + pageid + "/activatewebhook",
        beforeSend: function (xhr, opts) {
            document.getElementById("button-spinner").style.display = "block";
            document.getElementById("button-addPage").style.display = "none";
        },
        complete: function () {
            document.getElementById("button-spinner").style.display = "none";
            document.getElementById("button-addPage").style.display = "block";
        }
    }).done(function (page) {
        if (page.error) {
            var popup = document.getElementById("myPopup");
            popup.innerText = page.error;
            popup.classList.toggle("show");
        }
        if (page.id) {
            // Adding page tablinks
            // Get a reference to the pages tab links in the main DOM.
            var pages_tablinks = document.getElementById('pages-tablinks');
            // Clone the tablink template
            var page_tl_tmpl = document.getElementById('pages-tablink-template').content.cloneNode(true);
            // search tablink class and change its onclick attribute
            page_tl_tmpl.querySelector('.tablinks').setAttribute("onclick", "openCity(event, '" + page.id + "')");
            page_tl_tmpl.querySelector('.tablinks').innerText = page.name;
            // add a new tablink before the add page button
            var add_button = document.getElementById('pages-tablinks').querySelector('#button-addPage');
            pages_tablinks.insertBefore(page_tl_tmpl, add_button);

            // Adding page tab contents
            // Get a reference to the pages tab contents in the main DOM.
            var pages_tabcontents = document.getElementById('pages-tabcontents');
            // Clone the tabcontent template
            var page_tc_tmpl = document.getElementById('pages-tabcontent-template').content.cloneNode(true);
            // search tabcontent class and change its id to match the page name
            page_tc_tmpl.querySelector('.tabcontent').setAttribute("id", page.id);
            page_tc_tmpl.querySelector('.page-name').innerText = page.name;
            pages_tabcontents.appendChild(page_tc_tmpl);
        };
    });
};

// Close the dropdown if the user clicks outside of it
window.onclick = function (event) {
    if (!event.target.matches('.dropbtn')) {

        var dropdowns = document.getElementsByClassName("dropdown-content");
        var i;
        for (i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            };
        };
    };

    // hide page activate webhook error message
    var popup = document.getElementById("myPopup")
    popup.classList.remove("show");
};

function myFunction() {
    var txt = document.getElementsByTagName("bookstore");
    console.log(txt);
};

function openCity(evt, cityName) {
    // Declare all variables
    var i, tabcontent, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Show the current tab, and add an "active" class to the link that opened the tab
    document.getElementById(cityName).style.display = "block";
    evt.currentTarget.className += " active";
}

function createElement(element, attribute, inner) {
    //ref:: http://stackoverflow.com/questions/9422974/createelement-with-id
    if (typeof (element) === "undefined") { return false; }
    if (typeof (inner) === "undefined") { inner = ""; }
    var el = document.createElement(element);
    if (typeof (attribute) === 'object') {
        for (var key in attribute) {
            el.setAttribute(key, attribute[key]);
        }
    }
    el.appendChild(document.createTextNode(inner));
    return el;
}

