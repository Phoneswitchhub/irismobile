import os
import sys

try:
    from PIL import Image, ImageChops
    print("PIL is installed.")
except ImportError:
    print("PIL is NOT installed. Installing Pillow...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageChops

def crop_logo():
    template_path = 'public/contract_template.png'
    if not os.path.exists(template_path):
        print("Template image not found.")
        return
    
    img = Image.open(template_path)
    # The logo is in the top-left corner. Let's crop it.
    # In the template, the logo is located at approximately:
    # x: 40 to 180, y: 30 to 160
    # Let's crop (35, 30, 200, 160)
    logo = img.crop((35, 30, 200, 160))
    logo.save('public/iris_logo.png')
    print("Logo cropped and saved to public/iris_logo.png")

def make_stamp_transparent():
    stamp_path = 'public/company_stamp.png'
    if not os.path.exists(stamp_path):
        print("Stamp image not found.")
        return
    
    img = Image.open(stamp_path).convert("RGBA")
    datas = img.getdata()
    
    new_data = []
    for item in datas:
        r, g, b, a = item
        # If the pixel is very bright/white, make it transparent
        # A threshold of 180 for R, G, B works well for scanning white paper backgrounds
        if r > 185 and g > 185 and b > 185:
            new_data.append((255, 255, 255, 0)) # transparent
        else:
            # Enhance the blue stamp ink contrast slightly
            # Make the blue ink stand out more clearly
            new_data.append((r, g, b, 255))
            
    img.putdata(new_data)
    img.save('public/company_stamp_transparent.png', "PNG")
    print("Stamp background removed and saved to public/company_stamp_transparent.png")

if __name__ == '__main__':
    crop_logo()
    make_stamp_transparent()
