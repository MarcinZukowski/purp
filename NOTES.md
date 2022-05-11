
## Render gradient
magick -size 256x256 radial-gradient:white-none radial-gradient.png

## Some good pages
https://webgl-shaders.com/

## Running locally

Run:

    nohup python3 -m http.server

Access:

    http://localhost:8000/purp-map.html

## Pushing to S3

    time aws s3 sync --no-follow-symlinks --delete \
        --exclude '.*' --exclude "*.DS_Store" --exclude "*data-cache/*" \
        . s3://marcin-pub/purp/
