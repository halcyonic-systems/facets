import os

DATA_DIR = os.environ.get("BERT_LENSES_DATA_DIR", "/Users/home/Documents/bert-lenses/data")
USER_AGENT = "bert-lenses-pipeline/0.1"


def find_bert(explicit):
    return explicit or "target/debug/bert"
