#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os
import deepzoom
import urllib
import re

MAX_PAGES   = 10
PAGE_COUNT  = {}


def ensure_dir( filename ):
    directory = os.path.dirname( filename )
    if not os.path.exists( directory ):
        os.makedirs( directory )


# Create Deep Zoom Image creator with weird parameters
creator = deepzoom.ImageCreator(
    tile_size       = 512, 
    tile_overlap    = 2, 
    image_quality   = 1, 
    tile_format     = "tif",
    resize_filter   = "antialias"
)

tiff_list = open( 'tiffs.txt', 'r' )\
    .read()\
    .split( '\n' )

for tiff_url in tiff_list:
    print tiff_url
    parts = re.match(
        r'http://lcweb2\.loc\.gov/master/pnp/([a-z0-9]*)/([a-z0-9]*)/([a-z0-9]*)/([a-z0-9]*)u\.tif',
        tiff_url
    ).groups()

    agg     = parts[ 1 ]
    id      = parts[ 2 ]
    fileid  = parts[ 3 ]

    if id not in PAGE_COUNT:
        PAGE_COUNT[ id ] = 0

    path      = tiff_url.replace( 'http://lcweb2.loc.gov/master/', '' )
    dzi_files = path.replace( 'u.tif', '_files' )

    if PAGE_COUNT[ id ] < MAX_PAGES\
    and not os.path.exists( dzi_files ):

        print 'making directory: %s' % os.path.dirname( path )
        #ensure_dir( path )

        print 'downloading master tiff: %s' % tiff_url
        #tiff_file = open( path, 'wb' )
        #tiff_file.write( urllib.urlopen( tiff_url ).read() )
        #tiff_file.close()

        print 'creating dzi: %s' % path
        # Create Deep Zoom image pyramid from source
        creator.create( path, path.replace( 'u.tif', '.dzi' ) )

    PAGE_COUNT[ id ] += 1
