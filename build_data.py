import json
import re
from pathlib import Path

from docx import Document


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "世界现代设计史随堂测试知识点整理.docx"
OUTPUT = Path(__file__).resolve().parent / "data.js"


ALIASES = {
    "拉姆斯好的设计十大原则（重点背诵）": ["好的设计十大原则", "拉姆斯十原则", "迪特拉姆斯"],
    "约翰·拉斯金": ["拉斯金", "约翰拉斯金"],
    "威廉·莫里斯": ["莫里斯", "威廉莫里斯"],
    "弗兰克·莱特": ["莱特", "弗兰克赖特", "弗兰克劳埃德赖特"],
    "亨利·凡·德·威尔德": ["威尔德", "凡德威尔德"],
    "赫克特·吉马德": ["吉马德"],
    "维克多·霍塔": ["霍塔"],
    "安东尼·高迪": ["高迪"],
    "查尔斯·马金托什": ["马金托什"],
    "奥托·瓦格纳": ["瓦格纳"],
    "阿道夫·卢斯": ["卢斯", "装饰即罪恶"],
    "彼得·贝伦斯": ["贝伦斯"],
    "沃尔特·格罗皮乌斯": ["格罗皮乌斯"],
    "密斯·凡·德·罗": ["密斯", "密斯凡德罗", "少即是多"],
    "勒·柯布西耶": ["柯布西耶", "新建筑五点", "房屋是居住的机器"],
    "阿尔瓦·阿尔托": ["阿尔托"],
    "包豪斯的历史作用和影响": ["包豪斯影响", "包豪斯历史作用"],
    "俄国构成主义": ["构成主义"],
    "俄国至上主义": ["至上主义"],
    "荷兰风格派": ["风格派"],
    "有计划废止制度": ["计划废止制", "计划性废止"],
    "新艺术运动与工艺美术运动的对比": ["新艺术和工艺美术比较", "新艺术与工艺美术区别"],
}


IMAGES = {
    "水晶宫": {
        "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Crystal_Palace_-_interior.jpg?width=1200",
        "caption": "水晶宫内部：钢铁骨架、玻璃围护与预制装配共同形成通透的大跨度空间。",
    },
    "红屋": {
        "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Red_House_Bexleyheath_2013.jpg?width=1200",
        "caption": "红屋：裸露红砖、不对称体量与整体室内设计体现材料诚实和手工艺精神。",
    },
    "流水别墅": {
        "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Fallingwater3.jpg?width=1200",
        "caption": "流水别墅：水平悬挑体量嵌入岩层与溪流，建筑仿佛从环境中生长。",
    },
    "包豪斯": {
        "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Bauhaus_Dessau-001.jpg?width=1200",
        "caption": "包豪斯德绍校舍：玻璃幕墙、功能分区和非对称构成是现代主义的典型表达。",
    },
    "沃尔特·格罗皮乌斯": {
        "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Bauhaus_Dessau-001.jpg?width=1200",
        "caption": "包豪斯德绍校舍：玻璃幕墙使结构与内部活动直接显现。",
    },
    "瓦西里椅子": {
        "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Breuer_Wassily_Chair.jpg?width=1200",
        "caption": "瓦西里椅：弯曲钢管与皮革构成轻量、可复制的现代家具原型。",
    },
    "装饰艺术运动": {
        "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Empire_State_Building_from_the_Top_of_the_Rock.jpg?width=1200",
        "caption": "帝国大厦：层级退台与垂直线条将装饰性几何秩序用于摩天楼。",
    },
    "红蓝椅子": {
        "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Rietveld_chair_1.JPG?width=1200",
        "caption": "红蓝椅：直线、矩形与三原色把风格派的二维秩序转化为空间结构。",
    },
}


HIGH_FREQUENCY = {
    "工艺美术运动", "新艺术运动", "装饰艺术运动", "现代主义设计", "包豪斯",
    "德国工业同盟", "弗兰克·莱特", "有机建筑六原则", "芝加哥学派",
    "有计划废止制度", "流线型运动", "荷兰风格派", "俄国构成主义",
}


MEDIUM_FREQUENCY = {
    "设计的原则", "拉姆斯好的设计十大原则（重点背诵）", "巴洛克风格", "洛可可风格",
    "水晶宫", "约翰·拉斯金", "威廉·莫里斯", "红屋", "草原风格", "流水别墅",
    "新艺术运动与工艺美术运动的对比", "穆夏", "赫克特·吉马德", "亨利·凡·德·威尔德",
    "维克多·霍塔", "安东尼·高迪", "马金托什", "奥地利分离派", "阿道夫·卢斯",
    "彼得·贝伦斯", "卡桑德拉", "穆特修斯", "科隆论战", "沃尔特·格罗皮乌斯",
    "密斯·凡·德·罗", "勒·柯布西耶", "机器美学", "阿尔瓦·阿尔托",
    "包豪斯的历史作用和影响", "康定斯基", "布鲁尔", "瓦西里椅子", "马列维奇",
    "俄国至上主义", "塔特林", "蒙德里安", "红蓝椅子", "路易斯·沙利文",
}


WORK_OVERRIDES = {
    "包豪斯": ["包豪斯德绍校舍"],
    "沃尔特·格罗皮乌斯": ["包豪斯德绍校舍"],
    "密斯·凡·德·罗": ["巴塞罗那德国馆"],
    "勒·柯布西耶": ["萨伏伊别墅"],
    "阿尔瓦·阿尔托": ["帕米欧椅", "萨伏伊花瓶"],
    "荷兰风格派": ["红蓝椅"],
    "俄国构成主义": ["第三国际纪念塔"],
}


def clean(text):
    return re.sub(r"\s+", " ", text).strip()


def extract_works(parts):
    text = " ".join(parts)
    matches = re.findall(r"代表作[：:]([^。]+)", text)
    works = []
    for match in matches:
        works.extend(re.split(r"[、，,；;]", match))
    return [clean(item) for item in works if clean(item)]


def strip_works(text):
    return clean(re.sub(r"代表作[：:][^。]+。?", "", text))


def parse_source():
    document = Document(SOURCE)
    items = []
    chapter = "未分类"
    current = None

    for paragraph in document.paragraphs:
        text = clean(paragraph.text)
        if not text:
            continue
        style = paragraph.style.name if paragraph.style else ""
        if style == "Heading 1":
            chapter = text
            continue
        is_topic = (
            style == "Normal"
            and paragraph.runs
            and paragraph.runs[0].bold is True
            and paragraph.runs[0].font.color.rgb is not None
            and str(paragraph.runs[0].font.color.rgb) == "003366"
        )
        if is_topic:
            current = {"title": text, "chapter": chapter, "parts": []}
            items.append(current)
        elif current and text.startswith(("【总】", "【分】")):
            current["parts"].append(text[3:])

    result = []
    for index, item in enumerate(items, start=1):
        parts = item.pop("parts")
        if not parts:
            continue
        works = extract_works(parts)
        features = strip_works(parts[1] if len(parts) > 1 else "")
        impact = strip_works(parts[-1] if len(parts) > 2 else "")
        embedded_impact = re.search(r"(?:影响|意义)[：:]", features)
        if embedded_impact:
            impact = clean(features[embedded_impact.end():] + impact)
            features = clean(features[:embedded_impact.start()])
        result.append({
            "id": f"topic-{index:03d}",
            "title": item["title"],
            "chapter": item["chapter"],
            "background": strip_works(parts[0]),
            "features": features,
            "impact": impact,
            "works": works or WORK_OVERRIDES.get(item["title"], []),
            "aliases": ALIASES.get(item["title"], []),
            "frequency": (
                "high" if item["title"] in HIGH_FREQUENCY
                else "medium" if item["title"] in MEDIUM_FREQUENCY
                else "normal"
            ),
            "image": IMAGES.get(item["title"]),
        })
    bauhaus = next((item for item in result if item["title"] == "包豪斯"), None)
    bauhaus_impact = next((item for item in result if item["title"] == "包豪斯的历史作用和影响"), None)
    if bauhaus and bauhaus_impact:
        bauhaus["impact"] = clean(
            bauhaus["impact"]
            + "从历史作用看，"
            + bauhaus_impact["features"]
            + bauhaus_impact["impact"]
        )
    return result


def add_sullivan(items):
    items.append({
        "id": "topic-sullivan",
        "title": "路易斯·沙利文",
        "chapter": "第七章 工业设计与美国现代设计",
        "background": "路易斯·沙利文是19世纪末芝加哥学派的代表人物、美国现代建筑的奠基人之一，也是高层商业建筑革新的重要倡导者。",
        "features": "①提出“形式服从功能”，强调建筑形式由实际功能与结构逻辑决定；②主张整体与细部、形式与功能有机统一，并综合考虑社会和技术因素；③高层建筑采用三段法，下部为基座，中部为重复标准层，上部以出檐阁楼收束，从而清晰表现功能分区和竖向特征。",
        "impact": "他的理论与实践推动了美国高层商业建筑发展，为现代主义建筑奠定基础，并直接影响学生弗兰克·劳埃德·赖特的有机建筑思想。",
        "works": ["芝加哥会堂大厦", "温莱特大厦", "保证大厦"],
        "aliases": ["沙利文", "路易斯沙利文", "形式服从功能"],
        "frequency": "high",
        "image": None,
    })


def main():
    items = parse_source()
    add_sullivan(items)
    chapters = []
    for item in items:
        if item["chapter"] not in chapters:
            chapters.append(item["chapter"])
    payload = {
        "generatedFrom": [
            "世界现代设计史随堂测试知识点整理.docx",
            "现代设计史四题复习总结.docx",
        ],
        "chapters": chapters,
        "items": items,
    }
    OUTPUT.write_text(
        "window.DESIGN_HISTORY_DATA = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"Generated {len(items)} topics -> {OUTPUT}")


if __name__ == "__main__":
    main()
