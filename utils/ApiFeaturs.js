class APIfeatures {
  constructor(mongoesquery, queryString) {
    this.mongoesquery = mongoesquery;
    this.queryString = queryString;
    this.totalCount = 0;
  }

  filter() {
    const query0bj = { ...this.queryString };
    const excludedfields = ["page", "sort", "limit", "fields"];
    excludedfields.forEach((el) => delete query0bj[el]);

    // 1B) advanced filtering
    let queryStr = JSON.stringify(query0bj);
    queryStr = queryStr.replace(/\b(gte|gt|lt|lte)\b/g, (match) => `$${match}`);
    this.mongoesquery = this.mongoesquery.find(JSON.parse(queryStr)); // mongoesquery is requesting data from data base
    this.totalCountPromise = this.mongoesquery.clone().countDocuments();

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      // req.mongoesquery بمعني انو طلب.انو يطلب بيانات من قواعد البيانات
      const sortBy = this.queryString.sort.split(",").join(" "); // the split will تفصل كل حاجه ما بينهم ، وي join هتجمع ما بينهم تاني
      this.mongoesquery = this.mongoesquery.sort(sortBy);
    } else {
      this.mongoesquery = this.mongoesquery.sort("-createdAt"); // default sorting
    }
    return this; // we write return this cause we need to chain the methods
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.mongoesquery = this.mongoesquery.select(fields);
    } else {
      this.mongoesquery = this.mongoesquery.select("-__v");
    }
    return this;
  }

  pagination() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    const pagination = {};
    pagination.currentPage = page;
    pagination.limit = limit;

    // next page
    if (skip + limit < this.total) {
      pagination.nextPage = page + 1;
    }

    // previous page
    if (skip > 0) {
      pagination.previousPage = page - 1;
    }

    this.mongoesquery = this.mongoesquery.skip(skip).limit(limit);
    this.paginationResult = pagination;

    return this;
  }

  async getTotalCount() {
    if (this.totalCountPromise) {
      this.totalCount = await this.totalCountPromise;
    }
    return this.totalCount;
  }
}

module.exports = APIfeatures;
