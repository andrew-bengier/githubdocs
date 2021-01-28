/* globals hljs */
$(document).ready(() => {
    let isMobile = false;
    if($('#xs-element').css('display') === 'none'){
        isMobile = true;
    }

    // if there is a hash, trigger the change event to display the doc
    if(window.location.hash){
        $(window).trigger('hashchange');
    }

    injectFunctionality();

    // current sidebar links on page load
    getDocs((response) => {
        // create sidebar list from response
        populateSideMenu(organizeDocsByDir(response.docs));

        // set the navbar brand title from config
        $('.navbar-brand, .brand-logo').html(response.config.title);

        // set the hash to the first doc
        if(window.location.hash === '' && response.docs.length > 0){
            window.location.hash = '#' + response.docs[0].docSlug;
        }

        // store the inital list for later
        const currentListGroup = $('.sidebarLink');

        // populate the top menu
        populateTopMenu();

        // if user searches
        $('#searchInput').on('keyup', () => {
            // only search if input more than 2 chars
            if($('#searchInput').val().length > 2){
                $.ajax({
                    method: 'POST',
                    data: { keyword: $('#searchInput').val() },
                    url: '/search'
                })
                .done((response, status) => {
                    if(status === 'success'){
                        // remove current list
                        $('.sidebarLink').remove();

                        populateSideMenu(organizeDocsByDir(response));
                    }else{
                        // remove current list
                        $('.sidebarLink').remove();
                        $('.sidebar').append(currentListGroup);
                    }
                });
            }else{
                // remove current list
                $('.sidebarLink').remove();
                $('.sidebar').append(currentListGroup);
            }
        });
    });

    $('#sidebarCollapse').on('click', () => {
        $('#sidebar').toggleClass('active');
    });

    // When on mobile collapse sidebar when link clicked
    $('body').on('click', '.sidebarLink', () => {
        if(isMobile){
            $('#sidebar').toggleClass('active');
        }
    });

    $('body').on('click', '.sidebarLink a', () => {
        $('.sidebar-container').toggleClass('sidebar-container-show');
    });
});

$(window).bind('hashchange', () => {
    scrollTo();
    if(window.location.hash.trim() === '#' || window.location.hash.trim() === ''){
        getDocs((response) => {
            // show the first doc
            if(response.docs.length > 0){
                $('#main').html(response.docs[0].docBody);
                setMetaTags(response.docs[0]);
                window.location.hash = '#' + response.docs[0].docSlug;
            }else{
                $('#main').html('<h3>No docs. Please create some docs.<h3>');
            }
        });
    }else{
        $.ajax({
            method: 'GET',
            url: '/doc/' + parseURL().hash
        })
        .done((response, status) => {
            if(!response.doc.docBody){
                $('#main').html('<h1 class="text-center">404 Not found<h1>');
                return;
            }
            $('#main').html(response.doc.docBody);
            setMetaTags(response.doc);

            if(response.doc.nextDoc){
                $('#linkNext a').attr('href', '#' + response.doc.nextDoc.docSlug);
                $('#linkNext a').removeClass('hidden hide');
            }else{
                $('#linkNext a').addClass('hidden hide');
            }
            if(response.doc.prevDoc){
                $('#linkPrev a').attr('href', '#' + response.doc.prevDoc.docSlug);
                $('#linkPrev a').removeClass('hidden hide');
            }else{
                $('#linkPrev a').addClass('hidden hide');
            }

            $('pre code').each((i, block) => {
                hljs.highlightBlock(block);
            });

            $('img').each(function(value){
                $(this).parent().addClass('center-align align-center');
                $(this).addClass('img-responsive responsive-img');
            });

            // add anchor points to headings
            if(response.config.addAnchors){
                // scroll to given anchor
                scrollTo();
            }
        });
    }
});

function parseURL(){
    let url = window.location.hash;
    url = url.split('/');
    url.hash = url[0].substring(1, window.location.hash.length);
    if(url.length > 0){
        url.anchor = url[1];
    }

    return url;
}

// scrolls to an anchor point
function scrollTo(){
    const url = parseURL();
    const anchor = $('a[name=\'' + url.anchor + '\']');
    if(anchor.length){
        $('html,body').animate({ scrollTop: anchor.offset().top }, 150);
    }
}

// gets the docs from the API
function getDocs(callback){
    $.ajax({
        method: 'GET',
        url: '/sidebar'
    })
    .done((response, status) => {
        callback(response);
    });
}

// cleans HTML
function stripHTML(dirtyString){
    return $(dirtyString).text().trim();
}

// sets the mega tags for the page
function setMetaTags(doc){
    document.title = doc.docTitle;
    $('meta[property=\'og\\:title\']').attr('content', doc.docTitle);
    $('meta[name=title]').attr('content', doc.docTitle);
    if(stripHTML(doc.docBody).length > 160){
        $('meta[property=\'og\\:description\']').attr('content', stripHTML(doc.docBody.substring(0, 200)));
        $('meta[name=description]').attr('content', stripHTML(doc.docBody.substring(0, 200)));
    }else{
        $('meta[property=\'og\\:description\']').attr('content', stripHTML(doc.docBody));
        $('meta[name=description]').attr('content', stripHTML(doc.docBody));
    }
}

function organizeDocsByDir(data){
    return data.reduce((memo, doc) => {
        if(!memo[doc.docDir]){
          memo[doc.docDir] = [];
        }

        memo[doc.docDir].push(doc);

        return memo;
      }, {});
}

function populateSideMenu(dataByDir){
    $.each(dataByDir, (key, linkMetadatas) => {
        $('.sidebar').append(`
            <li class="list-group-item collection-item sidebarLink">
                <a onclick="expand('${key}-collapsible-content', this)" class="sidebar-title"><i class="collapsible-indicator"></i>${key}</a>
                <div class="collapsible-content" id="${key}-collapsible-content">
                    ${generateDocumentLinks(linkMetadatas)}
                </div>
            </li>
        `);
    });
}

function generateDocumentLinks(linkMetadatas){
    let html = '';

    linkMetadatas.forEach((linkMetadata) => {
        const link = `<a href="#${linkMetadata.docSlug}" class="document-link">${linkMetadata.docTitle}</a>\n`;

        html += link;
    });

    return html;
}

function populateTopMenu(){
    $.ajax({
        method: 'GET',
        url: '/config'
    })
    .done((response, status) => {
        $.each(response.menuItems, (key, value) => {
            $('.nav').append('<li><a href="' + value.menuLink + '">' + value.menuTitle + '</a></li>');
        });
    });
}

function injectFunctionality(){
    const script = document.createElement('script');

    script.innerHTML = expand.toString();
    $('head').append(script);

    function expand(key, context){
        $(`#${key}.collapsible-content`).toggleClass('expanded');
        $($(context).find('i')[0]).toggleClass('expanded');
    }
}
